package com.doomscroll.backend.exceptions;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.doomscroll.backend.dto.CaptchaErrorResponse;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(
            ApiException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = ex.getStatus();

        ApiError error = new ApiError(
            status.value(),
            status.getReasonPhrase(),
            ex.getMessage(),
            request.getRequestURI(),
            Instant.now()
        );

        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        String message = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(fieldError ->
                fieldError.getField() + ": " +
                fieldError.getDefaultMessage()
            )
            .collect(Collectors.joining("; "));

        ApiError error = new ApiError(
            status.value(),
            status.getReasonPhrase(),
            message,
            request.getRequestURI(),
            Instant.now()
        );

        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpectedException(
            Exception ex,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;

        ApiError error = new ApiError(
            status.value(),
            status.getReasonPhrase(),
            "Internal server error",
            request.getRequestURI(),
            Instant.now()
        );

        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler(CaptchaMismatchException.class)
    public ResponseEntity<CaptchaErrorResponse> handleCaptchaMismatch(
            CaptchaMismatchException ex
    ) {
        CaptchaErrorResponse response = new CaptchaErrorResponse(
                "MISMATCH",
                ex.getMessage(),
                Map.of("attemptsLeft", ex.getAttemptsLeft())
        );

        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_CONTENT)
                .body(response);
    }
}