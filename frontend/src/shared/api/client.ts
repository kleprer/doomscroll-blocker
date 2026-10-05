import type { Health, Poem, VerifyRequest, VerifySuccess } from '../types';

const API = 'http://localhost:8080/api/v1';

export async function fetchHealth(): Promise<Health> {
    const res = await fetch(`${API}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchPoems(): Promise<Poem[]> {
    const res = await fetch(`${API}/poems`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchNewPoem(difficulty?: number): Promise<Poem> {
    const url = difficulty
     ? `${API}/captcha/new?difficulty=${difficulty}`
     : `${API}/captcha/new`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function verifyCaptcha(body: VerifyRequest): Promise<VerifySuccess> {
    const res = await fetch(`${API}/captcha/verify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
    });
    
    if (res.ok) {
        return res.json();
    }

    const error = await res.json().catch(() => ({
        code: 'INTERNAL_ERROR',
        message: `HTTP ${res.status}`,
    }));
    throw error;
}