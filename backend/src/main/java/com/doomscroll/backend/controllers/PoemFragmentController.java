package com.doomscroll.backend.controllers;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springdoc.core.annotations.ParameterObject;

import com.doomscroll.backend.dto.CreatePoemFragmentRequest;
import com.doomscroll.backend.dto.PoemFragmentResponse;
import com.doomscroll.backend.services.PoemFragmentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin/poems")
@Tag(
    name = "Admin - Poems",
    description = "Административное управление стихотворениями"
)
public class PoemFragmentController {

    private final PoemFragmentService poemFragmentService;

    public PoemFragmentController(PoemFragmentService poemFragmentService) {
        this.poemFragmentService = poemFragmentService;
    }

    @PostMapping
    @Operation(summary = "Добавить стихотворение")
    @ApiResponse(responseCode = "201", description = "Стихотворение создано")
    public ResponseEntity<PoemFragmentResponse> createPoemFragment(
            @Valid @RequestBody CreatePoemFragmentRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(poemFragmentService.createPoemFragment(request));
    }

    @GetMapping
    @Operation(summary = "Получить все стихотворения")
    public Page<PoemFragmentResponse> getAllPoemFragments(
            @ParameterObject Pageable pageable
    ) {
        return poemFragmentService.getAllPoemFragments(pageable);
    }

    @GetMapping("/active")
    @Operation(summary = "Получить активные стихотворения")
    public Page<PoemFragmentResponse> getAllActivePoemFragments(
            @ParameterObject Pageable pageable
    ) {
        return poemFragmentService.getAllActivePoemFragments(pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Получить стихотворение по UUID")
    public PoemFragmentResponse getPoemFragmentById(
            @PathVariable UUID id
    ) {
        return poemFragmentService.getPoemFragmentById(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Обновить стихотворение")
    public PoemFragmentResponse updatePoemFragment(
            @PathVariable UUID id,
            @Valid @RequestBody CreatePoemFragmentRequest request
    ) {
        return poemFragmentService.updatePoemFragment(id, request);
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Активировать стихотворение")
    @ApiResponse(responseCode = "204", description = "Стихотворение активировано")
    public ResponseEntity<Void> activatePoemFragment(@PathVariable UUID id) {
        poemFragmentService.activatePoemFragment(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Деактивировать стихотворение")
    @ApiResponse(responseCode = "204", description = "Стихотворение деактивировано")
    public ResponseEntity<Void> deactivatePoemFragment(@PathVariable UUID id) {
        poemFragmentService.deactivatePoemFragment(id);
        return ResponseEntity.noContent().build();
    }
}