package com.doomscroll.backend.controllers;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Проверка состояния API")
public class HealthController {

    @GetMapping
    @Operation(summary = "Проверить доступность сервера")
    @ApiResponse(responseCode = "200", description = "Сервер доступен")
    public Map<String, String> health() {
        return Map.of(
                "status", "UP",
                "service", "doomscroll-backend",
                "version", "0.1"
        );
    }
}