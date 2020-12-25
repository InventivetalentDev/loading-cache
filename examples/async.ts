import { AsyncLoadingCache } from "../src";
import { Time } from "../src/util/Time";

const cache = new AsyncLoadingCache<string, number>({
        expireAfterAccess: Time.minutes(5),
        expireAfterWrite: Time.minutes(10)
    }, key => new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() * 100);
        }, Math.random() * 100);
    })
);
