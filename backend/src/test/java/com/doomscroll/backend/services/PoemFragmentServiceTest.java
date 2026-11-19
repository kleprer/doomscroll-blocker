package com.doomscroll.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.doomscroll.backend.dto.CreatePoemFragmentRequest;
import com.doomscroll.backend.exceptions.ApiException;
import com.doomscroll.backend.models.PoemFragment;
import com.doomscroll.backend.repositories.PoemFragmentRepository;
import com.doomscroll.backend.services.DifficultyService;
import com.doomscroll.backend.services.PoemFragmentService;

class PoemFragmentServiceTest {
    private PoemFragmentRepository repository;
    private PoemFragmentService service;

    @BeforeEach void setup() {
        repository = mock(PoemFragmentRepository.class);
        service = new PoemFragmentService(repository, new DifficultyService());
    }

    @Test void createsActivePoemAndSavesIt() {
        when(repository.save(any(PoemFragment.class))).thenAnswer(inv -> inv.getArgument(0));
        var response = service.createPoemFragment(new CreatePoemFragmentRequest(
                "Автор", "Название", "Первая строка\nВторая строка", "Источник"));
        assertEquals("Название", response.title());
        assertEquals("Автор", response.author());
        assertTrue(response.isActive());
        verify(repository).save(any(PoemFragment.class));
    }

    @Test void updatesExistingPoem() {
        var poem = poem();
        when(repository.findById(poem.getId())).thenReturn(Optional.of(poem));
        when(repository.save(any(PoemFragment.class))).thenAnswer(inv -> inv.getArgument(0));
        var updated = service.updatePoemFragment(poem.getId(),
                new CreatePoemFragmentRequest("Новый автор", "Новое название", "Новый текст", "Новый источник"));
        assertEquals("Новое название", updated.title());
        assertEquals("Новый текст", updated.content());
        assertEquals("Новый автор", poem.getAuthor());
    }

    @Test void deactivateKeepsPoemInRepositoryAndAllowsReactivation() {
        var poem = poem();
        when(repository.findById(poem.getId())).thenReturn(Optional.of(poem));
        service.deactivatePoemFragment(poem.getId());
        assertFalse(poem.getIsActive());
        service.activatePoemFragment(poem.getId());
        assertTrue(poem.getIsActive());
        verify(repository, times(2)).save(poem);
        verify(repository, never()).delete(any(PoemFragment.class));
    }

    @Test void publicListContainsOnlyActivePoems() {
        var active = poem();
        var inactive = poem();
        inactive.setIsActive(false);
        when(repository.findAll()).thenReturn(List.of(active, inactive));
        var result = service.getPublicPoems();
        assertEquals(1, result.size());
        assertEquals(active.getId(), result.get(0).poemId());
        assertEquals(2, result.get(0).lineCount());
    }

    @Test void missingPoemReturnsNotFound() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());
        var error = assertThrows(ApiException.class, () -> service.getPoemFragmentById(id));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test void rejectsDifficultyOutsideOneToFive() {
        var error = assertThrows(ApiException.class,
                () -> service.getRandomActivePoemFragmentByDifficulty(6));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(repository, never()).findAll();
    }

    @Test void noActivePoemAtRequestedDifficultyReturnsServiceUnavailable() {
        when(repository.findAll()).thenReturn(List.of());
        var error = assertThrows(ApiException.class,
                () -> service.getRandomActivePoemFragmentByDifficulty(1));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
    }

    private PoemFragment poem() {
        return new PoemFragment("Автор", "Название", "Первая строка\nВторая строка", "Источник");
    }
}
