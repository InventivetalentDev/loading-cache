export class CacheStats {
    static readonly HIT: string = "hit";
    static readonly MISS: string = "miss";
    static readonly LOAD_SUCCESS: string = "load_success";
    static readonly LOAD_FAIL: string = "load_failure";
    static readonly EXPIRE: string = "expire";

    static readonly ALL: string[] = [CacheStats.HIT, CacheStats.MISS, CacheStats.LOAD_SUCCESS, CacheStats.LOAD_FAIL, CacheStats.EXPIRE];

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
