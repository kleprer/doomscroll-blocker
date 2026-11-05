
package com.doomscroll.backend.exceptions;

public class CaptchaMismatchException extends RuntimeException {

    private final int attemptsLeft;

    public CaptchaMismatchException(int attemptsLeft) {
        super("Incorrect CAPTCHA answer");
        this.attemptsLeft = attemptsLeft;
    }

    public int getAttemptsLeft() {
        return attemptsLeft;
    }
}
