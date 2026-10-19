
package com.doomscroll.backend.dto;

import java.util.UUID;

import com.doomscroll.backend.models.enumclass.ChallengeType;

public record ChallengeResponse(
        UUID id,
        ChallengeType type,
        String author,
        String title,
        String displayText
) {
}
