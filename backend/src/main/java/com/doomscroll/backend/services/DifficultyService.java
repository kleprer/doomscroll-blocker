
package com.doomscroll.backend.services;

import org.springframework.stereotype.Service;

@Service
public class DifficultyService {

    public int calculateLineCount(String content) {
        if (content == null || content.isBlank()) {
            return 0;
        }

        return content.lines()
                .filter(line -> !line.isBlank())
                .toList()
                .size();
    }

    public int calculateDifficulty(String content) {
        int lineCount = calculateLineCount(content);

        if (lineCount <= 4) return 1;
        if (lineCount <= 8) return 2;
        if (lineCount <= 14) return 3;
        if (lineCount <= 20) return 4;

        return 5;
    }
}
