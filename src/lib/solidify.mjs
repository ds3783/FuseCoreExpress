const handler = {
    get: function (target, prop) {
        return prop in target ? target[prop] : undefined;
    },
    set: function (target, prop, value) {
        return value;
    }
};


export const CreateReadonlyProxy = function (obj) {
    return new Proxy(obj, handler);
}

export const Solidify = function (obj) {
    if (obj instanceof Object) {
        Object.freeze(obj);
        for (let prop in obj) {
            if (!obj.hasOwnProperty(prop)) {
                continue;
            }
            let value = obj[prop];
            if (value instanceof Object) {
                Solidify(value);
            }
        }
    }
    return obj;
}

export default Solidify;