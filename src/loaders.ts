import { Key } from "node-cache";

// Sync

export interface Loader<T> {
    (key: Key): T;
}

export interface MultiLoader<T> {
    (keys: Key[]): { [key: string]: T };
}

// Async

export interface AsyncLoader<T> {
    (key: Key): Promise<T>;
}

export interface AsyncMultiLoader<T> {
    (keys: Key[]): Promise<{ [key: string]: T }>;
}
