package com.doomscroll.backend.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record CaptchaRefreshRequest(
        @NotNull UUID requestId
) {
}