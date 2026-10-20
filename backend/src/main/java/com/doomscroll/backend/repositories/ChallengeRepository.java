package com.doomscroll.backend.repositories;

import java.util.UUID;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.doomscroll.backend.models.Challenge;

public interface ChallengeRepository extends MongoRepository<Challenge, UUID> {

    long countByCompletedAtIsNotNull();
}