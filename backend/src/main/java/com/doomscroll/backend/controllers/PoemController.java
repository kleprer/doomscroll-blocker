package com.doomscroll.backend.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.doomscroll.backend.dto.PoemResponse;
import com.doomscroll.backend.services.PoemFragmentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@RestController
@RequestMapping("/api/v1/poems")
@Tag(
    name = "Poems",
    description = "Публичный API для получения стихотворений"
)
public class PoemController {

    private final PoemFragmentService poemFragmentService;

    public PoemController(PoemFragmentService poemFragmentService) {
        this.poemFragmentService = poemFragmentService;
    }

    @GetMapping
    @Operation(
        summary = "Получить список стихотворений",
        description = "Возвращает активные стихотворения с количеством строк и уровнем сложности."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Список стихотворений успешно получен"
    )
    public List<PoemResponse> getPoems() {
        return poemFragmentService.getPublicPoems();
    }
}