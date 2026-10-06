package com.doomscroll.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChallengeResponse(
    UUID id,
    UUID poemFragmentId,
    String author,
    String title,
    String content,
    String source,
    LocalDateTime expiresAt
) {}