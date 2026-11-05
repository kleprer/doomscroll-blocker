package com.doomscroll.backend.repositories;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;

import com.doomscroll.backend.models.Challenge;

@Repository
public class ChallengeCompletionRepository {

    private static final int MAX_ATTEMPTS = 3;

    private final MongoTemplate mongoTemplate;

    public ChallengeCompletionRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public boolean completeIfActive(
            UUID challengeId,
            UUID clientId,
            LocalDateTime now
    ) {
        Query query = new Query(
                Criteria.where("_id").is(challengeId)
                        .and("clientId").is(clientId)
                        .and("completedAt").is(null)
                        .and("cancelledAt").is(null)
                        .and("expiresAt").gt(now)
                        .and("failedAttempts").lt(MAX_ATTEMPTS)
        );

        Update update = new Update()
                .set("completedAt", now);

        return mongoTemplate.updateFirst(
                query,
                update,
                Challenge.class
        ).getModifiedCount() == 1;
    }

    public void registerFailedAttemptIfActive(
            UUID challengeId,
            UUID clientId,
            LocalDateTime now
    ) {
        Query query = new Query(
                Criteria.where("_id").is(challengeId)
                        .and("clientId").is(clientId)
                        .and("completedAt").is(null)
                        .and("cancelledAt").is(null)
                        .and("expiresAt").gt(now)
        );

        Update update = new Update()
                .inc("failedAttempts", 1);

        mongoTemplate.updateFirst(
                query,
                update,
                Challenge.class
        );
    }
}