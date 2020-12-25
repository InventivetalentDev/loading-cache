import { Caches, LoadingCache } from "../src";
import { Time } from "../src/util/Time";

const cache = Caches.builder()
    .expireAfterWrite(Time.minutes(10))
    .expireAfterAccess(Time.minutes(5))
    .build(key => Math.random() * 100);
