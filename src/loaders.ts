// Sync

/**
 * Function to retrieve a value for a key
 */
export interface MappingFunction<K, V> {
    (key: K): V | undefined;
}

export interface Loader<K, V> extends MappingFunction<K, V> {
}

/**
 * Function to retrieve values for several keys at once.<br/>
 * Receives only the keys that are not cached yet.
 */
export interface MultiMappingFunction<K, V> {
    (keys: K[]): Map<K, V> | undefined;
}

export interface MultiLoader<K, V> extends MultiMappingFunction<K, V> {
    (keys: K[]): Map<K, V>;
}

// Async

/**
 * Function to retrieve a value for a key
 */
export interface AsyncMappingFunction<K, V> {
    (key: K): Promise<V | undefined>;
}

export interface AsyncLoader<K, V> {
    (key: K): Promise<V | undefined>;
}

/**
 * Function to retrieve values for several keys at once.<br/>
 * Receives only the keys that are not cached yet.
 */
export interface AsyncMultiMappingFunction<K, V> {
    (keys: K[]): Promise<Map<K, V> | undefined>;
}

export interface AsyncMultiLoader<K, V> extends AsyncMultiMappingFunction<K, V> {
    (keys: K[]): Promise<Map<K, V>>;
}
