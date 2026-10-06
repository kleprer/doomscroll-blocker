package com.doomscroll.backend.repositories;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.doomscroll.backend.models.Challenge;

public interface ChallengeRepository
        extends JpaRepository<Challenge, UUID> {
}