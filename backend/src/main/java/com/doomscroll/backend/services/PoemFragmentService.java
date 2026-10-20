package com.doomscroll.backend.services;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

import com.doomscroll.backend.dto.CreatePoemFragmentRequest;
import com.doomscroll.backend.dto.PoemFragmentResponse;
import com.doomscroll.backend.dto.PoemResponse;
import com.doomscroll.backend.exceptions.ApiException;
import com.doomscroll.backend.models.PoemFragment;
import com.doomscroll.backend.repositories.PoemFragmentRepository;

@Service
public class PoemFragmentService {

    private final PoemFragmentRepository poemFragmentRepository;
    private final DifficultyService difficultyService;

    public PoemFragmentService(
            PoemFragmentRepository poemFragmentRepository,
            DifficultyService difficultyService
    ) {
        this.poemFragmentRepository = poemFragmentRepository;
        this.difficultyService = difficultyService;
    }

    public PoemFragmentResponse createPoemFragment(CreatePoemFragmentRequest request) {
        PoemFragment poemFragment = new PoemFragment(
                request.author(),
                request.title(),
                request.content(),
                request.source()
        );

        PoemFragment savedPoemFragment = poemFragmentRepository.save(poemFragment);

        return convertToResponse(savedPoemFragment);
    }

    public PoemFragmentResponse getPoemFragmentById(UUID id) {
        PoemFragment poemFragment = findPoemFragment(id);

        return convertToResponse(poemFragment);
    }

    public Page<PoemFragmentResponse> getAllPoemFragments(Pageable pageable) {
        Page<PoemFragment> poemFragments = poemFragmentRepository.findAll(pageable);

        return poemFragments.map(this::convertToResponse);
    }

    public Page<PoemFragmentResponse> getAllActivePoemFragments(Pageable pageable) {
        Page<PoemFragment> poemFragments = poemFragmentRepository.findByIsActiveTrue(pageable);

        return poemFragments.map(this::convertToResponse);
    }

    public List<PoemResponse> getPublicPoems() {
        return poemFragmentRepository.findAll()
                .stream()
                .filter(poem -> Boolean.TRUE.equals(poem.getIsActive()))
                .map(this::toPoemResponse)
                .toList();
    }

    public PoemFragmentResponse updatePoemFragment(
            UUID id,
            CreatePoemFragmentRequest request
    ) {
        PoemFragment poemFragment = findPoemFragment(id);

        poemFragment.setAuthor(request.author());
        poemFragment.setTitle(request.title());
        poemFragment.setContent(request.content());
        poemFragment.setSource(request.source());

        PoemFragment updatedPoemFragment = poemFragmentRepository.save(poemFragment);

        return convertToResponse(updatedPoemFragment);
    }

    public PoemFragment getRandomActivePoemFragment() {
        return poemFragmentRepository.findRandomActivePoemFragment()
                .orElseThrow(() -> new ApiException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "No active poem fragments available"
                ));
    }

    public PoemFragment getRandomActivePoemFragmentByDifficulty(int difficulty) {
        if (difficulty < 1 || difficulty > 5) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Difficulty must be between 1 and 5"
            );
        }

        List<PoemFragment> poems = poemFragmentRepository.findAll()
                .stream()
                .filter(poem -> Boolean.TRUE.equals(poem.getIsActive()))
                .filter(poem ->
                        difficultyService.calculateDifficulty(poem.getContent()) == difficulty
                )
                .toList();

        if (poems.isEmpty()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No active poem fragments for difficulty: " + difficulty
            );
        }

        return poems.get(
                ThreadLocalRandom.current().nextInt(poems.size())
        );
    }

    public void deactivatePoemFragment(UUID id) {
        PoemFragment poemFragment = findPoemFragment(id);

        poemFragment.setIsActive(false);

        poemFragmentRepository.save(poemFragment);
    }

    public void activatePoemFragment(UUID id) {
        PoemFragment poemFragment = findPoemFragment(id);

        poemFragment.setIsActive(true);

        poemFragmentRepository.save(poemFragment);
    }

    private PoemFragment findPoemFragment(UUID id) {
        return poemFragmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "Poem fragment not found: " + id
                ));
    }

    private PoemFragmentResponse convertToResponse(PoemFragment poemFragment) {
        return new PoemFragmentResponse(
                poemFragment.getId(),
                poemFragment.getAuthor(),
                poemFragment.getTitle(),
                poemFragment.getContent(),
                poemFragment.getSource(),
                poemFragment.getIsActive(),
                poemFragment.getCreatedAt()
        );
    }

    private PoemResponse toPoemResponse(PoemFragment poem) {
        String content = poem.getContent();

        List<String> lines = content.lines()
                .filter(line -> !line.isBlank())
                .toList();

        return new PoemResponse(
                poem.getId(),
                poem.getTitle(),
                poem.getAuthor(),
                lines,
                lines.size(),
                difficultyService.calculateDifficulty(content)
        );
    }
}