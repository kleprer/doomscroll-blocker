export type Poem = { id: string; author: string; title: string; content: string; source: string; isActive: boolean; createdAt: string };
export type PoemInput = Pick<Poem, 'author' | 'title' | 'content' | 'source'>;
export type Page<T> = { content: T[]; totalElements: number; totalPages: number; number: number; size: number };
