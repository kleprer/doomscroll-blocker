export type ChallengeType = 'RETYPE' | 'FILL_IN';

export type Health = { status: string; service: string; version: string };

// GET /poems
export type Poem = {
  poemId: string;
  title: string;
  author: string;
  lines: string[];
  lineCount: number;
  difficultyLevel: number;
};

// GET /captcha/new
export type Captcha = Poem & {
  requestId: string;
  type: ChallengeType;
  displayText: string;
};

export type VerifyRequest = {
  requestId: string;
  poemId: string;
  userInput: string;
};

export type VerifySuccess = {
  requestId: string;
  blockedUntil: string; // ISO-8601
  poemsSolved: number;
  nextDifficulty: number;
};

// Реальная форма ошибок бэка (GlobalExceptionHandler)
export type ApiError = {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
};

export type ApiErrorInfo = {
  kind:
    | 'mismatch'
    | 'expired'
    | 'conflict'
    | 'not_found'
    | 'unavailable'
    | 'bad_request'
    | 'network'
    | 'unknown';
  message: string;
  status?: number;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiErrorInfo };