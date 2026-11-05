package com.doomscroll.backend.services;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
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
import com.doomscroll.backend.repositories.ChallengeCompletionRepository;
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
    private final ChallengeCompletionRepository completionRepository;
    private final MongoTemplate mongoTemplate;

    public ChallengeService(
            ChallengeRepository challengeRepository,
            PoemFragmentService poemFragmentService,
            DifficultyService difficultyService,
            ChallengeCompletionRepository completionRepository,
            MongoTemplate mongoTemplate
    ) {
        this.challengeRepository = challengeRepository;
        this.poemFragmentService = poemFragmentService;
        this.difficultyService = difficultyService;
        this.completionRepository = completionRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public CaptchaResponse createCaptcha(
            UUID clientId,
            String difficulty
    ) {
        if (clientId == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Client ID is required"
            );
        }

        int requestedDifficulty =
                resolveDifficulty(clientId, difficulty);

        PoemFragment poem =
                poemFragmentService
                        .getRandomActivePoemFragmentByDifficulty(
                                requestedDifficulty
                        );

        ChallengeType type =
                ThreadLocalRandom.current().nextBoolean()
                        ? ChallengeType.RETYPE
                        : ChallengeType.FILL_IN;

        String originalText = poem.getContent();
        String displayText = originalText;
        String expectedAnswer = originalText;

        if (type == ChallengeType.FILL_IN) {
            Matcher matcher =
                    WORD_PATTERN.matcher(originalText);

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
                int missingWords = Math.min(
                        calculateMissingWords(requestedDifficulty),
                        wordPositions.size()
                );
                Collections.shuffle(wordPositions);
                List<int[]> selectedPositions = wordPositions
                        .subList(0, missingWords)
                        .stream()
                        .sorted(Comparator.comparingInt(p -> p[0]))
                        .toList();

                StringBuilder displayBuilder = new StringBuilder();
                List<String> answers = new ArrayList<>();

                int lastIndex = 0;

                for (int[] position : selectedPositions) {
                        displayBuilder.append(
                                originalText,
                                lastIndex,
                                position[0]
                        );

                        displayBuilder.append("_____");

                        answers.add(
                                originalText.substring(
                                        position[0],
                                        position[1]
                                )
                        );

                        lastIndex = position[1];
                }

                displayBuilder.append(
                        originalText.substring(lastIndex)
                );

                displayText = displayBuilder.toString();

                expectedAnswer = String.join(" ", answers);
        }
        }

        Challenge challenge = new Challenge(
                clientId,
                poem.getId(),
                type,
                originalText,
                displayText,
                expectedAnswer
        );

        Challenge savedChallenge =
                challengeRepository.save(challenge);

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

    public CaptchaResponse refreshCaptcha(
            UUID clientId,
            UUID requestId
    ) {
        if (clientId == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Client ID is required"
            );
        }

        if (requestId == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "CAPTCHA ID is required"
            );
        }

        Challenge current = challengeRepository
                .findById(requestId)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "CAPTCHA not found"
                ));

        if (!clientId.equals(current.getClientId())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "CAPTCHA belongs to another client"
            );
        }

        if (current.isCompleted()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CAPTCHA already completed"
            );
        }

        if (current.isCancelled()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CAPTCHA already cancelled"
            );
        }

        if (current.isExpired()) {
            throw new ApiException(
                    HttpStatus.GONE,
                    "CAPTCHA has expired"
            );
        }

        if (current.getFailedAttempts() >= MAX_ATTEMPTS) {
            throw new ApiException(
                    HttpStatus.GONE,
                    "CAPTCHA attempt limit exceeded"
            );
        }

        LocalDateTime now = LocalDateTime.now();

        Query query = new Query(
                Criteria.where("_id").is(requestId)
                        .and("clientId").is(clientId)
                        .and("completedAt").is(null)
                        .and("cancelledAt").is(null)
                        .and("expiresAt").gt(now)
                        .and("failedAttempts").lt(MAX_ATTEMPTS)
        );

        Update update = new Update()
                .set("cancelledAt", now);

        Challenge cancelled = mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                Challenge.class
        );

        if (cancelled == null) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CAPTCHA is no longer active"
            );
        }

        return createCaptcha(clientId, "auto");
    }

    public CaptchaVerifyResponse verifyCaptcha(
            UUID clientId,
            CaptchaVerifyRequest request
    ) {
        if (clientId == null) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Client ID is required"
            );
        }

        Challenge challenge = challengeRepository
                .findById(request.requestId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "CAPTCHA not found: " + request.requestId()
                ));

        if (!clientId.equals(challenge.getClientId())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "CAPTCHA belongs to another client"
            );
        }

        if (!challenge.getPoemFragmentId()
                .equals(request.poemId())) {
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

        if (challenge.isCancelled()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CAPTCHA has been cancelled"
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
            Challenge updated =
                    completionRepository.registerFailedAttemptIfActive(
                            challenge.getId(),
                            clientId,
                            LocalDateTime.now()
                    );

            if (updated == null) {
                throw new ApiException(
                        HttpStatus.CONFLICT,
                        "CAPTCHA is no longer active"
                );
            }

            int attemptsLeft = Math.max(
                    0,
                    MAX_ATTEMPTS - updated.getFailedAttempts()
            );

            throw new CaptchaMismatchException(attemptsLeft);
        }

        boolean completed = completionRepository.completeIfActive(
                challenge.getId(),
                clientId,
                LocalDateTime.now()
        );

        if (!completed) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "CAPTCHA is no longer active"
            );
        }

        long completedCount = challengeRepository
                .countByClientIdAndCompletedAtIsNotNull(clientId);

        int poemsSolved = (int) Math.min(
                completedCount,
                Integer.MAX_VALUE
        );

        int nextDifficulty =
                calculateNextDifficulty(poemsSolved);

        Instant blockedUntil = Instant.now()
                .plus(UNBLOCK_MINUTES, ChronoUnit.MINUTES);

        return new CaptchaVerifyResponse(
                challenge.getId(),
                blockedUntil,
                poemsSolved,
                nextDifficulty
        );
    }

    private int resolveDifficulty(
            UUID clientId,
            String difficulty
    ) {
        if (difficulty == null || difficulty.equals("auto")) {
            long solved = challengeRepository
                    .countByClientIdAndCompletedAtIsNotNull(clientId);

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

    private int calculateMissingWords(int difficulty) {
        return switch (difficulty) {
                case 1, 2 -> 1;
                case 3, 4 -> 2;
                case 5 -> 3;
                default -> 1;
        };
}

    private String normalize(String text) {
        return text.strip()
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\t ]+", " ")
                .toLowerCase(Locale.ROOT);
    }
}
