import stream from "stream";

const clone = (target, source) => {
    for (let prop in source) {
        if (!source.hasOwnProperty(prop)) {
            continue;
        }
        let value = source[prop];
        if (value instanceof Array) {
            if (!target.hasOwnProperty(prop)) {
                target[prop] = [];
            }
            target[prop] = target[prop].concat(value);
        } else if (value instanceof WritableStream || value instanceof ReadableStream || value instanceof TransformStream) {
            if (!target.hasOwnProperty(prop)) {
                target[prop] = {};
            }
            target[prop] = value;
        } else if (value instanceof stream.Writable || value instanceof stream.Readable || value instanceof stream.Transform) {
            if (!target.hasOwnProperty(prop)) {
                target[prop] = {};
            }
            target[prop] = value;
        } else if (value instanceof Function) {
            if (!target.hasOwnProperty(prop)) {
                target[prop] = {};
            }
            target[prop] = value;
        } else if (value instanceof Object) {
            if (!target.hasOwnProperty(prop)) {
                target[prop] = {};
            }
            clone(target[prop], value);
        } else {
            target[prop] = value;
        }
    }
}

export const DeepClone = function () {
    let objs = Array.from(arguments);
    let target = objs.shift();
    for (let i = 0; i < objs.length; i++) {
        clone(target, objs[i]);
    }
    return target;
}

export default DeepClone;