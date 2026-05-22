import {EventEmitter} from 'events';


let nullInstance = {}, instanceObj = {}, inited = false;
//todo: config
//The order of this array is important
const modules = ['cache', 'log', 'request', 'manifest', 'monitor', 'ajax'];

import Solidify from './lib/solidify.mjs';

import DefaultConfig from "./config.mjs";
import DeepClone from "./lib/deepClone.mjs";


for (let module of modules) {
    let {nullModule} = await import('./lib/' + module + '/index.mjs');
    Object.assign(nullInstance, nullModule);
}


let eventEmitter = new EventEmitter();

export let init = async function (opt) {
    opt = DeepClone({}, DefaultConfig, opt || {});

    for (let module of modules) {
        let {default: moduleInstance} = await import('./lib/' + module + '/index.mjs');

        if (typeof moduleInstance.init === 'function') {
            if (moduleInstance.init.constructor.name === "AsyncFunction") {
                await moduleInstance.init(instanceObj, opt);
            } else {
                moduleInstance.init(instanceObj, opt);
            }

        }
        instanceObj[module] = moduleInstance;
    }
    Solidify(instanceObj);
    inited = true;
    eventEmitter.emit('INITED');
}


export let shutdown = async function () {
    console.log('close called');
    if (inited) {
        for (const module of modules) {
            let moduleInstance = instanceObj[module];

            if (typeof moduleInstance.shutdown === 'function') {
                if (moduleInstance.shutdown.constructor.name === "AsyncFunction") {
                    await moduleInstance.shutdown();
                } else {
                    moduleInstance.shutdown();
                }

            }
        }
        inited = false;
        eventEmitter.emit('SHUTDOWN');
    }

};

Object.assign(instanceObj, {
    on: function (event, callback) {
        eventEmitter.on(event, callback);
    },
    off: function (event, callback) {
        eventEmitter.removeListener(event, callback);
    }
});

Object.assign(nullInstance, {
    on: function (event, callback) {
        eventEmitter.on(event, callback);
    },
    off: function (event, callback) {
        eventEmitter.removeListener(event, callback);
    }
});


Solidify(nullInstance);


export default new Proxy({}, {
    get: function (target, prop) {
        if (prop === 'isInitialized') {
            return inited;
        }
        if (prop === 'init') {
            return init;
        }
        if (prop === 'shutdown') {
            return shutdown;
        }
        if (inited) {
            target[prop] = instanceObj[prop];
            return target[prop];
        } else {
            target[prop] = nullInstance[prop];
            return target[prop];
        }
    }
});

