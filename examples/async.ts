import { AsyncLoadingCache, Caches } from "../src";
import { Time } from "@inventivetalent/time";

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
