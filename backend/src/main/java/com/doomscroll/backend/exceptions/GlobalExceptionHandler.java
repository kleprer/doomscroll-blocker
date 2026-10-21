package com.doomscroll.backend.exceptions;

import java.time.Instant;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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

    // Перехватывает ошибки парсинга JSON (например, если в Swagger забыли закрыть кавычку)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleJsonParseException(
            HttpMessageNotReadableException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        ApiError error = new ApiError(
            status.value(),
            status.getReasonPhrase(),
            "Malformed JSON request",
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
        // ЭТА СТРОКА ВЫВЕДЕТ ПОЛНЫЙ СТЕКТРЕЙС ОШИБКИ В КОНСОЛЬ DOCKER
        log.error("Unhandled exception occurred: {}", ex.getMessage(), ex);

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
}