
package com.doomscroll.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.doomscroll.backend.dto.CaptchaResponse;
import com.doomscroll.backend.dto.CaptchaVerifyRequest;
import com.doomscroll.backend.dto.CaptchaVerifyResponse;
import com.doomscroll.backend.services.ChallengeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;

import jakarta.validation.Valid;

@RestController
@Validated
@RequestMapping("/api/v1/captcha")
@Tag(
    name = "Captcha",
    description = "Создание и проверка заданий RETYPE и FILL_IN"
)
public class CaptchaController {

    private final ChallengeService challengeService;

    public CaptchaController(ChallengeService challengeService) {
        this.challengeService = challengeService;
    }

    @GetMapping("/new")
    @Operation(
        summary = "Получить новую CAPTCHA",
        description = """
            Создаёт CAPTCHA одного из двух типов:

            RETYPE — необходимо перепечатать весь текст стихотворения.

            FILL_IN — необходимо ввести пропущенное слово.

            Параметр difficulty определяет уровень сложности
            от 1 до 5 или auto для автоматического выбора.
            """
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "CAPTCHA успешно создана",
            content = @Content(
                schema = @Schema(implementation = CaptchaResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Некорректный уровень сложности"
        ),
        @ApiResponse(
            responseCode = "503",
            description = "Нет подходящих стихотворений"
        )
    })
    public ResponseEntity<CaptchaResponse> createCaptcha(
            @Parameter(
                description = "Уровень сложности: auto, 1, 2, 3, 4 или 5",
                example = "auto"
            )
            @RequestParam(defaultValue = "auto")
            String difficulty
    ) {
        CaptchaResponse response =
                challengeService.createCaptcha(difficulty);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    @Operation(
        summary = "Проверить ответ на CAPTCHA",
        description = """
            Проверяет ответ в зависимости от сохранённого типа задания.

            RETYPE — сравнивает введённый текст со стихотворением.

            FILL_IN — сравнивает введённое слово с пропущенным.

            При успешном решении обновляет прогресс пользователя.
            """
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "CAPTCHA успешно решена",
            content = @Content(
                schema = @Schema(implementation = CaptchaVerifyResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Некорректный запрос"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "CAPTCHA не найдена"
        ),
        @ApiResponse(
            responseCode = "409",
            description = "CAPTCHA уже завершена"
        ),
        @ApiResponse(
            responseCode = "410",
            description = "Срок действия CAPTCHA истёк"
        ),
        @ApiResponse(
            responseCode = "422",
            description = "Неправильный ответ — MISMATCH"
        )
    })
    public ResponseEntity<CaptchaVerifyResponse> verifyCaptcha(
            @Valid @RequestBody CaptchaVerifyRequest request
    ) {
        CaptchaVerifyResponse response =
                challengeService.verifyCaptcha(request);

        return ResponseEntity.ok(response);
    }
}
