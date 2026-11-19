package com.doomscroll.backend.services;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import com.doomscroll.backend.dto.CaptchaVerifyRequest;
import com.doomscroll.backend.exceptions.ApiException;
import com.doomscroll.backend.exceptions.CaptchaMismatchException;
import com.doomscroll.backend.models.Challenge;
import com.doomscroll.backend.models.PoemFragment;
import com.doomscroll.backend.models.enumclass.ChallengeType;
import com.doomscroll.backend.repositories.ChallengeCompletionRepository;
import com.doomscroll.backend.repositories.ChallengeRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChallengeServiceTest {
    private ChallengeRepository repository;
    private PoemFragmentService poems;
    private ChallengeCompletionRepository completion;
    private ChallengeService service;

    @BeforeEach void setup() {
        repository = mock(ChallengeRepository.class);
        poems = mock(PoemFragmentService.class);
        completion = mock(ChallengeCompletionRepository.class);
        service = new ChallengeService(repository, poems, new DifficultyService(),
                completion, mock(MongoTemplate.class));
    }

    @Test void rejectsMissingClientId() {
        var error = assertThrows(ApiException.class, () -> service.createCaptcha(null, "auto"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
    }

    @Test void rejectsInvalidDifficulty() {
        var error = assertThrows(ApiException.class,
                () -> service.createCaptcha(UUID.randomUUID(), "9"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(poems);
    }

    @Test void createsCaptchaAndPersistsChallenge() {
        var clientId = UUID.randomUUID();
        var poem = new PoemFragment("Автор", "Название", "Первая строка\nВторая строка", "Источник");
        when(poems.getRandomActivePoemFragmentByDifficulty(1)).thenReturn(poem);
        when(repository.save(any(Challenge.class))).thenAnswer(inv -> inv.getArgument(0));
        var result = service.createCaptcha(clientId, "1");
        assertNotNull(result.requestId());
        assertEquals(poem.getId(), result.poemId());
        assertEquals(1, result.difficultyLevel());
        verify(repository).save(argThat(c -> clientId.equals(c.getClientId())
                && poem.getId().equals(c.getPoemFragmentId())));
    }

    @Test void rejectsVerificationByAnotherClient() {
        var challenge = challenge();
        when(repository.findById(challenge.getId())).thenReturn(Optional.of(challenge));
        var request = new CaptchaVerifyRequest(challenge.getId(), challenge.getPoemFragmentId(), "Ответ");
        var error = assertThrows(ApiException.class,
                () -> service.verifyCaptcha(UUID.randomUUID(), request));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(completion);
    }

    @Test void wrongAnswerRegistersFailedAttempt() {
        var challenge = challenge();
        when(repository.findById(challenge.getId())).thenReturn(Optional.of(challenge));
        var updated = challenge();
        updated.registerFailedAttempt();
        when(completion.registerFailedAttemptIfActive(eq(challenge.getId()),
                eq(challenge.getClientId()), any())).thenReturn(updated);
        var request = new CaptchaVerifyRequest(challenge.getId(), challenge.getPoemFragmentId(), "неверно");
        var error = assertThrows(CaptchaMismatchException.class,
                () -> service.verifyCaptcha(challenge.getClientId(), request));
        assertEquals(2, error.getAttemptsLeft());
        verify(completion, never()).completeIfActive(any(), any(), any());
    }

    @Test void correctAnswerCompletesChallengeAndIncreasesDifficulty() {
        var challenge = challenge();
        when(repository.findById(challenge.getId())).thenReturn(Optional.of(challenge));
        when(completion.completeIfActive(eq(challenge.getId()), eq(challenge.getClientId()), any()))
                .thenReturn(true);
        when(repository.countByClientIdAndCompletedAtIsNotNull(challenge.getClientId())).thenReturn(3L);
        var request = new CaptchaVerifyRequest(challenge.getId(), challenge.getPoemFragmentId(), "  ПРАВИЛЬНЫЙ   ОТВЕТ  ");
        var result = service.verifyCaptcha(challenge.getClientId(), request);
        assertEquals(3, result.poemsSolved());
        assertEquals(2, result.nextDifficulty());
        assertTrue(result.blockedUntil().isAfter(java.time.Instant.now()));
    }

    private Challenge challenge() {
        return new Challenge(UUID.randomUUID(), UUID.randomUUID(), ChallengeType.RETYPE,
                "Правильный ответ", "Правильный ответ", "Правильный ответ");
    }
}
