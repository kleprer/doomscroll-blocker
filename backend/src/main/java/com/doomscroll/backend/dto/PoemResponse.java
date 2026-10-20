package com.doomscroll.backend.dto;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Стихотворение с уровнем сложности")
public record PoemResponse(

        @Schema(description = "UUID стихотворения")
        UUID poemId,

        @Schema(description = "Название стихотворения")
        String title,

        @Schema(description = "Автор стихотворения")
        String author,

        @Schema(description = "Строки стихотворения")
        List<String> lines,

        @Schema(description = "Количество строк", example = "4")
        int lineCount,

        @Schema(description = "Уровень сложности от 1 до 5", example = "1")
        int difficultyLevel
) {}