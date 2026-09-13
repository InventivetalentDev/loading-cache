## loading-cache
Caching utility for NodeJS with loading functionality, based on [ben-manes/caffeine](https://github.com/ben-manes/caffeine)

```
npm install --save @inventivetalent/loading-cache
```

# Usage

All durations are in milliseconds; `Time` is re-exported for convenience.

## [Sync](https://inventivetalent.org/loading-cache/classes/LoadingCache.html)
```typescript
import { Caches, Time, LoadingCache } from "@inventivetalent/loading-cache";

const cache: LoadingCache<string, number> = Caches.builder()
    .expireAfterWrite(Time.minutes(10))
    .expireAfterAccess(Time.minutes(5))
    .build(key => Math.random() * 100);

cache.get("a"); // loaded on first access, cached afterwards
```

## [Async](https://inventivetalent.org/loading-cache/classes/AsyncLoadingCache.html)
```typescript
import { Caches, Time, AsyncLoadingCache } from "@inventivetalent/loading-cache";

const cache: AsyncLoadingCache<string, number> = Caches.builder()
    .expireAfterWrite(Time.minutes(10))
    .expireAfterAccess(Time.minutes(5))
    .buildAsync(
        key => new Promise(resolve => {
            setTimeout(() => {
                resolve(Math.random() * 100);
            }, Math.random() * 10);
        })
    );

await cache.get("a");
```

A load that rejects is not cached - the next `get` for that key retries. Values stored
explicitly with `put` are kept as-is.

## Cleaning up

Caches run a cleanup timer for expired entries. The timer does not keep the process
alive, but call `end()` when a cache is no longer needed to stop it and drop all entries:

```typescript
cache.end();
```
