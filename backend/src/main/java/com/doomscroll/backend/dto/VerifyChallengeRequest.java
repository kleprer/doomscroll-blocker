package com.doomscroll.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyChallengeRequest(
        @NotBlank String answer
) {
}
