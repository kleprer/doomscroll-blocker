
package com.doomscroll.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.doomscroll.backend.models.enumclass.ChallengeType;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Document(collection = "challenges")
public class Challenge {

    @Id
    private UUID id = UUID.randomUUID();

    @Field("poem_fragment_id")
    private UUID poemFragmentId;

    private ChallengeType type;

    private String originalText;

    private String displayText;

    private String expectedAnswer;

    @Field("created_at")
    private LocalDateTime createdAt;

    @Field("expires_at")
    private LocalDateTime expiresAt;

    @Field("completed_at")
    private LocalDateTime completedAt;

    public Challenge(
            UUID poemFragmentId,
            ChallengeType type,
            String originalText,
            String displayText,
            String expectedAnswer
    ) {
        this.poemFragmentId = poemFragmentId;
        this.type = type;
        this.originalText = originalText;
        this.displayText = displayText;
        this.expectedAnswer = expectedAnswer;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = createdAt.plusMinutes(15);
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isCompleted() {
        return completedAt != null;
    }

    public void complete() {
        this.completedAt = LocalDateTime.now();
    }
}
