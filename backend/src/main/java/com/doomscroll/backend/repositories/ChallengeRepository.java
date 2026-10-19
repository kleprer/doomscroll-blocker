package com.doomscroll.backend.repositories;

import java.util.UUID;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import com.doomscroll.backend.models.Challenge;

public interface ChallengeRepository extends MongoRepository<Challenge, UUID> {

    @Query(value = "{ 'completedAt': { '$ne': null } }", count = true)
    long countCompletedChallenges();
}