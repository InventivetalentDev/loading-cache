import { LoadingCache } from "../src";
import { Time } from "../src/util/Time";

const cache = new LoadingCache<string, number>({
    expireAfterAccess: Time.minutes(5),
    expireAfterWrite: Time.minutes(10)
}, key => Math.random() * 100);
