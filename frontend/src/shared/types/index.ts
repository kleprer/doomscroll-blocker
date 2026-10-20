export type Poem = {
    poemId: number;
    title: string;
    author: string;
    lines: string[];
    lineCount: number;
    difficultyLevel: number;
};

export type Health = {
    status: string;
    service: string;
    version: string;
};

export type VerifyRequest = {
    requestId: string;
    poemId: number;
    userInput: string;
};

export type VerifySuccess = {
    requestId: string;
    blockedUntil: string;
    poemsSolved: number;
    nextDifficulty: number;
};

export type VerifyError = {
    code: 'MISMATCH' | 'RATE_LIMIT_EXCEEDED' | 'POEM_NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
    details?: {
        attemptsLeft?: number;
        retryAfterSeconds?: number;
    };
};


