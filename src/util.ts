export function asArray<K>(iterable: Iterable<K>): Array<K> {
    if (iterable instanceof Array) {
        return iterable as Array<K>;
    }
    return Array.from(iterable);
}

export function keyCompletablePromiseMapToPromiseContainingMap<K, V>(keyToPromiseMap: Map<K, CompletablePromise<V | undefined>>): Promise<Map<K, V>> {
    const keys = asArray(keyToPromiseMap.keys());
    const values = asArray(keyToPromiseMap.values());
    return Promise.all(values.map(p => p.promise)).then(resolvedValues => {
        const valueMap = new Map<K, V>();
        // Map iteration order is insertion order, so keys and values line up
        keys.forEach((key, i) => {
            const value = resolvedValues[i];
            // Undefined values are not returned
            if (typeof value !== "undefined") {
                valueMap.set(key, value);
            }
        });
        return valueMap;
    });
}

export function keyPromiseMapToPromiseContainingMap<K, V>(keyToPromiseMap: Map<K, Promise<V | undefined>>): Promise<Map<K, V>> {
    const keys = asArray(keyToPromiseMap.keys());
    const values = asArray(keyToPromiseMap.values());
    return Promise.all(values).then(resolvedValues => {
        const valueMap = new Map<K, V>();
        // Map iteration order is insertion order, so keys and values line up
        keys.forEach((key, i) => {
            const value = resolvedValues[i];
            // Undefined values are not returned
            if (typeof value !== "undefined") {
                valueMap.set(key, value);
            }
        });
        return valueMap;
    });
}

export class CompletablePromise<T> {

    private readonly _promise: Promise<T>;
    // Assigned synchronously by the Promise executor, which TypeScript can't see
    private _resolve!: (value: T | PromiseLike<T>) => void;
    private _reject!: (reason?: any) => void;

    private _settled = false;

    constructor() {
        this._promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    static of<T>(value: Promise<T>): CompletablePromise<T> {
        const promise = new CompletablePromise<T>();
        value.then(
            v => promise.resolve(v),
            e => promise.reject(e)
        );
        return promise;
    }

    static completedPromise<T>(value: T | PromiseLike<T>): CompletablePromise<T> {
        const completable = new CompletablePromise<T>();
        completable.resolve(value);
        return completable;
    }

    get promise(): Promise<T> {
        return this._promise;
    }

    /**
     * Whether {@link resolve} or {@link reject} has been called
     */
    get settled(): boolean {
        return this._settled;
    }

    /**
     * @deprecated use {@link settled} - this is also <code>true</code> after a rejection
     */
    get resolved(): boolean {
        return this._settled;
    }

    resolve(value?: T | PromiseLike<T>): void {
        if (this._settled) {
            return;
        }
        this._settled = true;
        // Resolving without a value yields a promise of undefined; the executor's resolve
        // is typed as requiring one, so the optional argument is passed through as-is
        this._resolve(value as T | PromiseLike<T>);
    }

    reject(reason?: any): void {
        if (this._settled) {
            return;
        }
        this._settled = true;
        this._reject(reason);
    }

    /**
     * Mark a rejection of this promise as handled, so it is not reported as an unhandled rejection.
     * Consumers attaching their own handlers later still observe the rejection.
     */
    ignoreRejection(): this {
        this._promise.catch(() => {
            // intentionally empty - the rejection is surfaced to real consumers instead
        });
        return this;
    }

    then<TResult1 = T, TResult2 = never>(
        fulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
        rejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2> {
        return this._promise.then(fulfilled, rejected);
    }

    catch<TResult = never>(
        rejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): Promise<T | TResult> {
        return this._promise.catch(rejected);
    }

}

/**
 * Whether a loader produced an actual value.<br/>
 * Falsy values such as <code>0</code>, <code>""</code> or <code>false</code> are values;
 * <code>undefined</code> and <code>null</code> mean "nothing was loaded".
 */
export function isValue<V>(value: V | undefined | null): value is V {
    return typeof value !== "undefined" && value !== null;
}
