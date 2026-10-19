package com.doomscroll.backend.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Запрос проверки CAPTCHA")
public record CaptchaVerifyRequest(

        @NotNull
        @Schema(description = "UUID задания")
        UUID requestId,

        @NotNull
        @Schema(description = "UUID стихотворения")
        UUID poemId,

        @NotBlank
        @Schema(
            description = "Полный текст для RETYPE или пропущенное слово для FILL_IN"
        )
        String userInput
) {}