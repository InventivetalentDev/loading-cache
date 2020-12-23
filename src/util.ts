export function asArray<K>(iterable: Iterable<K>): Array<K> {
    if (iterable instanceof Array) {
        return iterable as Array<K>;
    }
    return Array.from(iterable);
}

export function keyPromiseMapToPromiseContainingMap<K, V>(keyToPromiseMap: Map<K, Promise<V>>): Promise<Map<K, V>> {
    return new Promise<Map<K, V>>(resolve => {
        const keys = keyToPromiseMap.keys();
        const values = keyToPromiseMap.values();
        Promise.all(values).then(resolvedValues => {
            const valueMap = new Map<K, V>();
            let i = 0;
            // The promises *should* be in the original order of the map
            for (let key of keys) {
                let promise = resolvedValues[i++];
                valueMap.set(key, promise);
            }
            resolve(valueMap);
        })
    })
}
