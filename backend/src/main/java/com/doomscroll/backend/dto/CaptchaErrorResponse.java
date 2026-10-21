
package com.doomscroll.backend.dto;

import java.util.Map;

public record CaptchaErrorResponse(
        String code,
        String message,
        Map<String, Integer> details
) {}
