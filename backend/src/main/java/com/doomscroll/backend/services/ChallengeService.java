package com.doomscroll.backend.services;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.doomscroll.backend.dto.CaptchaResponse;
import com.doomscroll.backend.dto.CaptchaVerifyRequest;
import com.doomscroll.backend.dto.CaptchaVerifyResponse;
import com.doomscroll.backend.exceptions.ApiException;
import com.doomscroll.backend.exceptions.CaptchaMismatchException;
import com.doomscroll.backend.models.Challenge;
import com.doomscroll.backend.models.PoemFragment;
import com.doomscroll.backend.models.enumclass.ChallengeType;
import com.doomscroll.backend.repositories.ChallengeRepository;

@Service
public class ChallengeService {

    private static final Pattern WORD_PATTERN =
            Pattern.compile("[\\p{L}]+");


    private static final int MAX_DIFFICULTY = 5;
    private static final int SOLVED_PER_LEVEL = 3;
    private static final int UNBLOCK_MINUTES = 15;
    private static final int MAX_ATTEMPTS = 3;
    

    private final ChallengeRepository challengeRepository;
    private final PoemFragmentService poemFragmentService;
    private final DifficultyService difficultyService;

    public ChallengeService(
            ChallengeRepository challengeRepository,
            PoemFragmentService poemFragmentService,
            DifficultyService difficultyService
    ) {
        this.challengeRepository = challengeRepository;
        this.poemFragmentService = poemFragmentService;
        this.difficultyService = difficultyService;
    }

    public CaptchaResponse createCaptcha(String difficulty) {

        int requestedDifficulty = resolveDifficulty(difficulty);

        PoemFragment poem =
                poemFragmentService.getRandomActivePoemFragmentByDifficulty(
                        requestedDifficulty
                );

        ChallengeType type = ThreadLocalRandom.current().nextBoolean()
                ? ChallengeType.RETYPE
                : ChallengeType.FILL_IN;

        String originalText = poem.getContent();
        String displayText = originalText;
        String expectedAnswer = originalText;

        if (type == ChallengeType.FILL_IN) {

            Matcher matcher = WORD_PATTERN.matcher(originalText);
            List<int[]> wordPositions = new ArrayList<>();

            while (matcher.find()) {
                if (matcher.group().length() >= 3) {
                    wordPositions.add(new int[]{
                            matcher.start(),
                            matcher.end()
                    });
                }
            }

            if (wordPositions.isEmpty()) {
                type = ChallengeType.RETYPE;
            } else {

                int[] position = wordPositions.get(
                        ThreadLocalRandom.current()
                                .nextInt(wordPositions.size())
                );

                expectedAnswer = originalText.substring(
                        position[0],
                        position[1]
                );

                displayText =
                        originalText.substring(0, position[0])
                        + "_____"
                        + originalText.substring(position[1]);
            }
        }

        Challenge challenge = new Challenge(
                poem.getId(),
                type,
                originalText,
                displayText,
                expectedAnswer
        );

        Challenge savedChallenge = challengeRepository.save(challenge);

        List<String> lines = displayText.lines()
                .filter(line -> !line.isBlank())
                .toList();

        return new CaptchaResponse(
                savedChallenge.getId(),
                poem.getId(),
                type,
                poem.getTitle(),
                poem.getAuthor(),
                lines,
                displayText,
                difficultyService.calculateLineCount(originalText),
                difficultyService.calculateDifficulty(originalText)
        );
    }

    public CaptchaVerifyResponse verifyCaptcha(
            CaptchaVerifyRequest request
    ) {

        Challenge challenge = challengeRepository
                .findById(request.requestId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "CAPTCHA not found: " + request.requestId()
                ));

        if (!challenge.getPoemFragmentId().equals(request.poemId())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Poem ID does not match CAPTCHA"
            );
        }

        if (challenge.isCompleted()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CAPTCHA already completed"
            );
        }

        if (challenge.isExpired()) {
            throw new ApiException(
                    HttpStatus.GONE,
                    "CAPTCHA has expired"
            );
        }

        if (challenge.getFailedAttempts() >= MAX_ATTEMPTS) {
                throw new ApiException(
                        HttpStatus.GONE,
                        "CAPTCHA attempt limit exceeded"
                );
                }

        boolean correct = normalize(request.userInput())
                .equals(normalize(challenge.getExpectedAnswer()));

        if (!correct) {
                challenge.registerFailedAttempt();
                challengeRepository.save(challenge);

                int attemptsLeft = MAX_ATTEMPTS - challenge.getFailedAttempts();

                throw new CaptchaMismatchException(attemptsLeft);
                }

        challenge.complete();
        challengeRepository.save(challenge);

        long completedCount =
                challengeRepository.countByCompletedAtIsNotNull();

        int poemsSolved = (int) Math.min(
                completedCount,
                Integer.MAX_VALUE
        );

        int nextDifficulty = calculateNextDifficulty(poemsSolved);

        Instant blockedUntil = Instant.now()
                .plus(UNBLOCK_MINUTES, ChronoUnit.MINUTES);

        return new CaptchaVerifyResponse(
                challenge.getId(),
                blockedUntil,
                poemsSolved,
                nextDifficulty
        );
    }

    private int resolveDifficulty(String difficulty) {

        if (difficulty == null || difficulty.equals("auto")) {
            long solved = challengeRepository.countByCompletedAtIsNotNull();

            return calculateNextDifficulty(solved);
        }

        try {
            int level = Integer.parseInt(difficulty);

            if (level < 1 || level > MAX_DIFFICULTY) {
                throw new NumberFormatException();
            }

            return level;

        } catch (NumberFormatException exception) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Difficulty must be auto or a number from 1 to 5"
            );
        }
    }

    private int calculateNextDifficulty(long poemsSolved) {
        return (int) Math.min(
                MAX_DIFFICULTY,
                1 + poemsSolved / SOLVED_PER_LEVEL
        );
    }

    private String normalize(String text) {
        return text.strip()
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\t ]+", " ")
                .toLowerCase(Locale.ROOT);
    }
}