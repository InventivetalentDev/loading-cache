## loading-cache
Caching utility for NodeJS with loading functionality, based on [ben-manes/caffeine](https://github.com/ben-manes/caffeine)

```
npm install --save @inventivetalent/loading-cache
```

# Usage

## Sync
```typescript
import { Caches, Time, LoadingCache } from "@inventivetalent/loading-cache";

const cache = Caches.builder()
    .expireAfterWrite(Time.minutes(10))
    .expireAfterAccess(Time.minutes(5))
    .build(key => Math.random() * 100);
```

## Async
```typescript
import { Caches, Time, AsyncLoadingCache } from "@inventivetalent/loading-cache";

const cache = Caches.builder()
    .expireAfterWrite(Time.minutes(10))
    .expireAfterAccess(Time.minutes(5))
    .buildAsync(
        key => new Promise(resolve => {
            setTimeout(() => {
                resolve(Math.random() * 100);
            }, Math.random() * 10);
        })
    );
```
