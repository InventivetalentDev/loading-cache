export class CacheStats {
    static readonly HIT = "hit";
    static readonly MISS = "miss";
    static readonly LOAD_SUCCESS = "load_success";
    static readonly LOAD_FAIL = "load_failure";
    static readonly EXPIRE = "expire";

    private readonly map = new Map<string, number>();

    inc(key: string, amount: number = 1) {
        this.map.set(key, this.get(key) + amount);
    }

    get(key: string): number {
        return this.map.get(key) || 0;
    }

    reset(): void {
        this.map.clear();
    }

    public toString(): string {
        return JSON.stringify(this.map, null, 2);
    }
}
