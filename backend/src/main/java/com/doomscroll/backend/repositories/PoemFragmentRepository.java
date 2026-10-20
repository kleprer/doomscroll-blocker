package com.doomscroll.backend.repositories;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

import com.doomscroll.backend.models.PoemFragment;

public interface PoemFragmentRepository extends MongoRepository<PoemFragment, UUID> {
        Page<PoemFragment> findByIsActiveTrue(Pageable pageable);

        @Aggregation(pipeline = {
                "{ '$match': { 'is_active': true } }",
                "{ '$sample': { 'size': 1 } }"
        })
        Optional<PoemFragment> findRandomActivePoemFragment();

}