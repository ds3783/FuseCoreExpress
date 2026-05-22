let cacheData = {};

let lastUpdateTime = 0;
let updateHandler = null;


let updateCache = function () {
    let now = (new Date()).getTime();
    let expiredKeys = [];

    for (let key in cacheData) {
        if (cacheData.hasOwnProperty(key)) {
            let data = cacheData[key];
            if (data.expires > 0 && data.expires < now) {
                expiredKeys.push(key);
            }
        }
    }
    if (expiredKeys.length > 0) {
        for (let key of expiredKeys) {
            delete cacheData[key];
        }
    }
    lastUpdateTime = now;
};


export default {
    init: function () {
        updateCache();
        if (updateHandler) {
            clearInterval(updateHandler);
        }
        updateHandler = setInterval(function () {
            updateCache();
        }, 60000);
    },
    close: function () {
        if (updateHandler) {
            clearInterval(updateHandler);
        }
        cacheData = {};
        lastUpdateTime = 0;
    },
    get: async function (key) {
        let data = cacheData[key];
        if (data) {
            return (data.data);
        } else {
            return null;
        }
    },
    set: async function (key, val, timeout) {
        let oldVal = await this.get(key);
        let expires = timeout > 0 ? (Date.now() + timeout * 1e3) : -1;
        cacheData[key] = {data: val, expires: expires};
        return oldVal;
    },
    del: async function (key) {
        let val = await this.get(key);
        delete cacheData[key];
        return val;
    }
};

