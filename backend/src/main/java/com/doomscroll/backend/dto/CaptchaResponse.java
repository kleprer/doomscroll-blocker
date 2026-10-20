package com.doomscroll.backend.dto;

import java.util.List;
import java.util.UUID;

import com.doomscroll.backend.models.enumclass.ChallengeType;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Созданная CAPTCHA")
public record CaptchaResponse(

        @Schema(description = "UUID задания")
        UUID requestId,

        @Schema(description = "UUID стихотворения")
        UUID poemId,

        @Schema(description = "Тип задания", example = "FILL_IN")
        ChallengeType type,

        @Schema(description = "Название стихотворения")
        String title,

        @Schema(description = "Автор стихотворения")
        String author,

        @Schema(description = "Строки задания")
        List<String> lines,

        @Schema(description = "Текст задания, который необходимо показать пользователю")
        String displayText,

        @Schema(description = "Количество строк стихотворения", example = "4")
        int lineCount,

        @Schema(description = "Уровень сложности", example = "1")
        int difficultyLevel
) {}