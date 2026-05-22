import {ajax} from './request.mjs' ;

const NO_REJECT_REQUEST = function (opts) {
    return new Promise((resolve) => {
        ajax(opts).then((data) => {
            resolve(data);
        }, (err) => {
            err.data = null;
            resolve(err);
        });
    });
};

export function requestAll(opts) {
    return new Promise(function (resolve, reject) {
        if (!Array.isArray(opts)) {
            resolve([]);
            return;
        }
        let promises = [];
        for (let o of opts) {
            promises.push(NO_REJECT_REQUEST(o));
        }
        Promise.all(promises).then((r) => {
            resolve(r);
        }, (r) => {
            reject(r);
        });
    });

}