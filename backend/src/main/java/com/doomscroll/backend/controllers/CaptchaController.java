package com.doomscroll.backend.controllers;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.doomscroll.backend.dto.CaptchaResponse;
import com.doomscroll.backend.dto.CaptchaVerifyRequest;
import com.doomscroll.backend.dto.CaptchaVerifyResponse;
import com.doomscroll.backend.dto.CaptchaErrorResponse;
import com.doomscroll.backend.dto.CaptchaRefreshRequest;
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

            X-Client-Id — уникальный идентификатор установки
            браузерного расширения. Используется для
            индивидуального расчёта прогресса.
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
            description = "Некорректный clientId или уровень сложности"
        ),
        @ApiResponse(
            responseCode = "503",
            description = "Нет подходящих стихотворений"
        )
    })
    public ResponseEntity<CaptchaResponse> createCaptcha(

            @Parameter(
                description = "Уникальный UUID клиента",
                required = true,
                example = "11111111-1111-4111-8111-111111111111"
            )
            @RequestHeader("X-Client-Id")
            UUID clientId,

            @Parameter(
                description = "Уровень сложности: auto, 1, 2, 3, 4 или 5",
                example = "auto"
            )
            @RequestParam(defaultValue = "auto")
            String difficulty
    ) {
        CaptchaResponse response =
                challengeService.createCaptcha(clientId, difficulty);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    @Operation(
        summary = "Проверить ответ на CAPTCHA",
        description = """
            Проверяет ответ в зависимости от сохранённого типа задания.

            RETYPE — сравнивает введённый текст со стихотворением.

            FILL_IN — сравнивает введённое слово с пропущенным.

            X-Client-Id должен совпадать с идентификатором,
            использованным при создании CAPTCHA.

            При успешном решении обновляется индивидуальный
            прогресс клиента.
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
            description = "Некорректный запрос или clientId"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "CAPTCHA принадлежит другому клиенту"
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
            description = "CAPTCHA просрочена или исчерпаны попытки"
        ),
        @ApiResponse(
            responseCode = "422",
            description = "Неправильный ответ — MISMATCH",
            content = @Content(
                schema = @Schema(implementation = CaptchaErrorResponse.class)
            )
        )
    })
    public ResponseEntity<CaptchaVerifyResponse> verifyCaptcha(

            @Parameter(
                description = "UUID клиента, создавшего CAPTCHA",
                required = true,
                example = "11111111-1111-4111-8111-111111111111"
            )
            @RequestHeader("X-Client-Id")
            UUID clientId,

            @Valid
            @RequestBody
            CaptchaVerifyRequest request
    ) {
        CaptchaVerifyResponse response =
                challengeService.verifyCaptcha(clientId, request);

        return ResponseEntity.ok(response);
    }
    @PostMapping("/refresh")
    @Operation(
        summary = "Заменить текущую CAPTCHA",
        description = """
            Отменяет текущую CAPTCHA и создаёт новую.

            После успешного обновления старая CAPTCHA
            больше не может быть использована для проверки.

            X-Client-Id должен совпадать с идентификатором
            клиента, создавшего исходную CAPTCHA.

            Новая CAPTCHA создаётся с автоматическим
            выбором уровня сложности.
            """
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "CAPTCHA успешно заменена",
            content = @Content(
                schema = @Schema(implementation = CaptchaResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Некорректный запрос"
        ),
        @ApiResponse(
            responseCode = "403",
            description = "CAPTCHA принадлежит другому клиенту"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "CAPTCHA не найдена"
        ),
        @ApiResponse(
            responseCode = "409",
            description = "CAPTCHA уже решена, отменена или неактивна"
        ),
        @ApiResponse(
            responseCode = "410",
            description = "CAPTCHA просрочена"
        ),
        @ApiResponse(
            responseCode = "503",
            description = "Нет подходящих стихотворений"
        )
    })
    public ResponseEntity<CaptchaResponse> refreshCaptcha(

            @Parameter(
                description = "UUID клиента",
                required = true
            )
            @RequestHeader("X-Client-Id")
            UUID clientId,

            @Valid
            @RequestBody
            CaptchaRefreshRequest request
    ) {
        CaptchaResponse response = challengeService.refreshCaptcha(
                clientId,
                request.requestId()
        );

        return ResponseEntity.ok(response);
    }

}
