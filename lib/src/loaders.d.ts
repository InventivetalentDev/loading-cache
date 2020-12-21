/**
 * Function to retrieve a value for a key
 */
export interface MappingFunction<K, V> {
    (key: K): V | undefined;
}
export interface Loader<K, V> extends MappingFunction<K, V> {
}
export interface MultiLoader<K, V> {
    (keys: K[]): Map<K, V>;
}
/**
 * Function to retrieve a value for a key
 */
export interface AsyncMappingFunction<K, V> {
    (key: K): Promise<V | undefined>;
}
export interface AsyncLoader<K, V> {
    (key: K): Promise<V | undefined>;
}
export interface AsyncMultiLoader<K, V> {
    (keys: K[]): Promise<Map<K, V>>;
}
