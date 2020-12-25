## loading-cache
Caching utility for NodeJS with loading functionality, based on [ben-manes/caffeine](https://github.com/ben-manes/caffeine)


# Usage

## Sync
```typescript
import { LoadingCache, Time } from "loading-cache";

const cache = new LoadingCache<string, number>({
    expireAfterAccess: Time.minutes(5),
    expireAfterWrite: Time.minutes(10)
}, key => Math.random() * 100);
```

## Async
```typescript
import { AsyncLoadingCache, Time } from "loading-cache";

const cache = new AsyncLoadingCache<string, number>({
        expireAfterAccess: Time.minutes(5),
        expireAfterWrite: Time.minutes(10)
    }, key => new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() * 100);
        }, Math.random() * 100);
    })
);
```
