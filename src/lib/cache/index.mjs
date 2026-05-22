import memoryImpl
    from './memory.mjs';
import redisImpl
    from './redis.mjs';
import nullImpl
    from './null.mjs';
import {
    getProperty
} from 'dot-prop';

let implInstance = null;

export let nullModule = nullImpl;

export default {
    get: async function (key) {
        if (!implInstance) {
            throw new Error('Cache module haven\'t initialized!');
        }
        return await implInstance.get(key);
    },
    set: async function (key, val, timeout) {
        timeout = timeout || 300;
        if (!implInstance) {
            throw new Error('Cache module haven\'t initialized!');
        }
        if (val === null || typeof val === 'undefined') {
            return await implInstance.del(key);
        } else {
            return await implInstance.set(key, val, timeout);
        }
    },
    init: async function (modules, opt) {
        let impl = getProperty(opt, 'cache.impl') || 'memory';
        switch (impl) {
            case 'memory':
                implInstance = memoryImpl;
                implInstance.init();
                return implInstance;
            case 'redis':
                implInstance = redisImpl;
                const redisOptions = getProperty(opt, 'cache.redis') || {};
                await implInstance.init(redisOptions);
                return implInstance;
        }
        throw new Error('Unsupported cache type: ' + impl);
    },
    shutdown: async function () {
        if (implInstance && implInstance.close) {
            await implInstance.close();
        }
    }
};


