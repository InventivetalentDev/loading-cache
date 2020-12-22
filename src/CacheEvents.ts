import { EventEmitter } from "events";

export class CacheEvents {
    static readonly EXPIRE = "expire";

    static readonly ALL: string[] = [CacheEvents.EXPIRE];

    static forward(source: EventEmitter, emitter: EventEmitter) {
        CacheEvents.ALL.forEach(e => {
            source.on(e, (...args: any[]) => emitter.emit(e, args));
        });
    }
}
