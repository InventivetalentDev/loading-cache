import { EventEmitter } from "events";

/**
 * Static definitions of all cache events
 */
export class CacheEvents {
    /**
     * (key, value)
     */
    static readonly EXPIRE = "expire";
    /**
     * (stat, incAmount, prevAmount)
     */
    static readonly STAT = "stat";
    /**
     * (error)
     */
    static readonly ERROR = "error";

    static readonly ALL: string[] = [CacheEvents.EXPIRE, CacheEvents.STAT, CacheEvents.ERROR];

    static forward(source: EventEmitter, emitter: EventEmitter) {
        CacheEvents.ALL.forEach(e => {
            source.on(e, (...args: any[]) => emitter.emit(e, ...args));
        });
    }
}
