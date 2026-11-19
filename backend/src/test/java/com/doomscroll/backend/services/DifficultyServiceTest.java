package com.doomscroll.backend.services;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DifficultyServiceTest {
    private final DifficultyService service = new DifficultyService();

    @Test void blankContentHasZeroLines() {
        assertEquals(0, service.calculateLineCount(null));
        assertEquals(0, service.calculateLineCount("  \n "));
    }

    @Test void ignoresEmptyLines() {
        assertEquals(3, service.calculateLineCount("Первая\n\nВторая\n   \nТретья"));
    }

    @Test void mapsLineCountsToFiveDifficultyLevels() {
        assertEquals(1, service.calculateDifficulty(lines(4)));
        assertEquals(2, service.calculateDifficulty(lines(5)));
        assertEquals(2, service.calculateDifficulty(lines(8)));
        assertEquals(3, service.calculateDifficulty(lines(9)));
        assertEquals(3, service.calculateDifficulty(lines(14)));
        assertEquals(4, service.calculateDifficulty(lines(15)));
        assertEquals(4, service.calculateDifficulty(lines(20)));
        assertEquals(5, service.calculateDifficulty(lines(21)));
    }

    private String lines(int count) { return "строка\n".repeat(count); }
}
