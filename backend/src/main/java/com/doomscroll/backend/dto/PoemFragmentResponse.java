package com.doomscroll.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PoemFragmentResponse(
    UUID id,
    String author,
    String title,
    String content,
    String source,
    Boolean isActive,
    LocalDateTime createdAt
) {}