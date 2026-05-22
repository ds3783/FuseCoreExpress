import http from 'http';
import https from 'https';
import zlib from 'zlib';

import {default as AjaxLogger} from './ajaxLogger.mjs';

import {generateRequestParameters} from './utils.mjs';

import {default as CONFIG} from './config.mjs';

const preservedHeaders = ['host', 'accept', 'accept-encoding', 'connection', 'accept-encoding', 'content-length'];

let logger = null;

export function setRequestLogger(l) {
    logger = l;
}

export function ajax(options) {
    options = options || {};

    let reqOptions = generateRequestParameters(options, preservedHeaders);
    let implModule = reqOptions.isHttps ? https : http;
    let ajaxLogger = new AjaxLogger();
    logger && logger.debug('ajax.request:', reqOptions.opts);

    ajaxLogger.logStart(reqOptions);
    return new Promise(function (resolve, reject) {
        let ret = CONFIG.getDefaultRet();
        if (options.performance) {
            ret.startTime = process.hrtime()
        }
        let resolveFacade = function (options, data) {
            ajaxLogger.logSuccess(data);
            if (data.startTime) {
                data.duration = process.hrtime(data.startTime);
            }
            resolve(data);
        };

        let rejectFacade = function (options, data) {
            ajaxLogger.logFail(options, data);
            if (data.startTime) {
                data.duration = process.hrtime(data.startTime);
            }
            reject(data);
        };

        let request = implModule.request(reqOptions.opts, function (response) {

            ret.headers = response.headers;
            ret.status = response.statusCode;

            if (typeof ret.headers['x-total-count'] !== 'undefined') {
                ret.totalCount = ret.headers['x-total-count'];
            }

            let contentEncoding = ret.headers['content-encoding'];
            let responseStream;
            switch (contentEncoding) {
                case 'gzip':
                    responseStream = zlib.createGunzip();
                    break;
                case 'deflate':
                    responseStream = zlib.createDeflateRaw();
                    break;
                case 'br':
                    responseStream = zlib.createBrotliDecompress();
                    break;
                case 'identity':
                    responseStream = response;
                    break;
                default:
                    ret.headers['x-warn'] = 'Unrecognized Content-Encoding';
                    responseStream = response;
                    break;
            }
            if (responseStream !== response) {
                response.pipe(responseStream);
            }
            if (reqOptions.returnStream) {
                ret.raw = responseStream;
                resolveFacade(reqOptions.opts, ret);
                return;
            }

            responseStream.on('error', function (err) {
                ret.error = err;
                ret.message = err.message;
                rejectFacade(reqOptions.opts, ret);
            });

            let retBody = [];
            responseStream.on('data', function (data) {
                retBody.push(data);
            });
            responseStream.on('end', function () {
                let bodyStr;
                bodyStr = Buffer.concat(retBody);
                ret.raw = bodyStr;
                if (ret.status >= 200 && ret.status < 300) {
                    if (typeof options.resContentType === 'undefined' ? /application\/json/.test(ret.headers['content-type']) : options.resContentType === 'json') {
                        try {
                            ret.data = JSON.parse(ret.raw);
                            ret.ok = true;
                            resolveFacade(reqOptions.opts, ret);
                        } catch (e) {
                            ret.error = e;
                            ret.message = 'Error parse JSON: ' + e.message;
                            ret.data = bodyStr;
                            rejectFacade(reqOptions.opts, ret);
                        }
                    } else {
                        ret.data = (typeof bodyStr === 'string') ? bodyStr : bodyStr.toString();
                        ret.ok = true;
                        resolveFacade(reqOptions.opts, ret);
                    }
                } else {
                    ret.data = bodyStr;
                    rejectFacade(reqOptions.opts, ret);
                }
            });
        });
        request.on('error', function (err) {
            ret.status = 0;
            ret.error = err;
            ret.message = err.message;
            rejectFacade(reqOptions.opts, ret);
        });
        request.on('timeout', function () {
            request.abort();
            ajaxLogger.logTimeout();
        });
        if (!reqOptions.queryInUrl && reqOptions.opts.reqData) {
            let reqData = reqOptions.opts.reqData;
            if (Array.isArray(reqOptions.opts.reqData)) {
                for (let data of reqData) {
                    request.write(data);
                    request.write("\r\n");
                }
            } else {
                request.write(reqData);
            }

        }
        request.end();
    });
}

