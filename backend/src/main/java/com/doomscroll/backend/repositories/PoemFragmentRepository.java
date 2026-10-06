package com.doomscroll.backend.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.doomscroll.backend.models.PoemFragment;

public interface PoemFragmentRepository extends JpaRepository<PoemFragment, UUID> {
        List<PoemFragment> findByIsActiveTrue();
}