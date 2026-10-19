package com.doomscroll.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record CaptchaVerifyResponse(
        UUID requestId,
        Instant blockedUntil,
        int poemsSolved,
        int nextDifficulty
) {}