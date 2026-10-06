package com.doomscroll.backend.dto;

import java.util.UUID;

public record CompleteChallengeRequest(
    UUID challengeId,
    String answer
) {}