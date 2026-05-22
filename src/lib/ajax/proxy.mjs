import http from 'http';
import https from 'https';
import fs from 'fs';

import FormData from 'form-data';


import {default as AjaxLogger} from './ajaxLogger.mjs';

import {generateRequestParameters} from './utils.mjs';

import {default as CONFIG} from './config.mjs';


import {Writable} from 'stream';

class LengthCalculatorStream extends Writable {
    constructor(options) {
        super(options);
        this.totalLength = 0;
    }

    _write(chunk, encoding, callback) {
        this.totalLength += chunk.length;
        callback();
    }
}

const preservedHeaders = ['host', 'connection'];

let logger = null;

export function setProxyLogger(l) {
    logger = l;
}

export function proxy(options) {
    options = options || {};
    let reqOptions = generateRequestParameters(options, preservedHeaders);
    let implModule = reqOptions.isHttps ? https : http;

    let ajaxLogger = new AjaxLogger();
    logger && logger.debug('ajax.proxy:', reqOptions.opts);
    ajaxLogger.logStart(reqOptions);
    return new Promise(function (resolve, reject) {
        let ret = CONFIG.getDefaultRet();

        let resolveFacade = function (data) {
            ajaxLogger.logSuccess(data);
            resolve(data);
        };

        let rejectFacade = function (options, data) {
            ajaxLogger.logFail(options, data);
            reject(data);
        };

        if (!options.res) {
            ret.message = 'res property doesn\'t exists!';
            rejectFacade(reqOptions.opts, ret);
            return;
        }
        if (!options.req) {
            ret.message = 'req property doesn\'t exists!';
            rejectFacade(reqOptions.opts, ret);
            return;
        }

        let clientRequest = options.req, clientResponse = options.res;
        let multipartFormData = null;
        let directPipe = clientRequest.readableLength > 0 ||
            ((!clientRequest.body || Object.keys(clientRequest.body).length === 0) &&
                (!clientRequest.files || Object.keys(clientRequest.files).length === 0));
        if (!directPipe) {
            //if request body has resolved into data and request is a multipart/form-data request.
            //we need to construct a multipart/form-data form data object before headers are sent.
            /*
               * clientRequest.files = {
               * files: [Object: null prototype] {
                   file: {
                     name: 'i18n_en.json',
                     data: <Buffer >,
                     size: 8023,
                     encoding: '7bit',
                     tempFilePath: '/var/folders/_3/9k8y1ch57vl_y6fzqcv4xsdc0000gn/T/tmp-1-1692760857687',
                     truncated: false,
                     mimetype: 'application/json',
                     md5: '5007011d63c0644e50f80d4eb1cd3199',
                     mv: [Function: mv]
                   }
                 },
               * 
            */
            if (/multipart\/form-data/.test(clientRequest.headers['content-type'])) {
                multipartFormData = new FormData();

                // Add fields
                for (const [key, value] of Object.entries(clientRequest.body)) {
                    multipartFormData.append(key, value);
                }

                // Add files
                for (const [key, file] of Object.entries(clientRequest.files)) {
                    const fileStream = fs.createReadStream(file.tempFilePath);
                    multipartFormData.append(key, fileStream, {
                        filename: file.name,
                        knownLength: file.size,
                        contentType: file.mimetype,
                    });
                }
                if (reqOptions.opts.headers) {
                    //remove content-type and content-length header
                    let headers = reqOptions.opts.headers;
                    delete headers['content-type'];
                    delete headers['content-length'];
                    delete headers['Content-Type'];
                    delete headers['Content-Length'];
                    //add multipart/form-data header
                    Object.assign(headers, multipartFormData.getHeaders());
                }
            }
        }

        let request = implModule.request(reqOptions.opts, function (response) {

            ret.headers = response.headers;
            ret.status = response.statusCode;

            response.on('error', function (err) {
                ret.err = err;
                ret.message = err.message;
                clientResponse.status(response.statusCode).end(err.toString());
                rejectFacade(reqOptions.opts, ret);
            });

            response.on('end', function () {
                ret.data = ret.raw = null;
                if (ret.status >= 200 && ret.status < 300) {
                    ret.ok = true;
                    resolveFacade(ret);
                } else {
                    rejectFacade(reqOptions.opts, ret);
                }
            });

            clientResponse.writeHeader(response.statusCode, response.headers);
            response.pipe(clientResponse);
        });
        request.on('timeout', function () {
            request.abort();
            ajaxLogger.logTimeout();
        });
        request.on('error', function (err) {
            ret.err = err;
            ret.message = err.message;
            clientResponse.status(500).end(err.message);
            rejectFacade(reqOptions.opts, ret);
        });
        if (!directPipe) {
            //for request body has resolved into data
            const lengthCalculatorStream = new LengthCalculatorStream();
            lengthCalculatorStream.on('finish', () => {
                logger.info(`Total data length: ${lengthCalculatorStream.totalLength} bytes`);
            });
            let endWriting = true;
            if (!reqOptions.queryInUrl && reqOptions.opts.reqData) {
                logger.info(`Proxy body data from ajax options`);
                let reqData = reqOptions.opts.reqData;
                if (Array.isArray(reqOptions.opts.reqData)) {
                    for (let data of reqData) {
                        request.write(data);
                        request.write("\r\n");
                        lengthCalculatorStream.write(data);
                        lengthCalculatorStream.write("\r\n");
                    }
                } else {
                    request.write(reqData);
                    lengthCalculatorStream.write(reqData);
                }

            } else {
                logger.info(`Proxy body data from parsed request body content type: ${clientRequest.headers['content-type']}`);
                //pipe request body to remote
                if (/application\/json/.test(clientRequest.headers['content-type'])) {
                    let data = JSON.stringify(clientRequest.body);
                    request.write(data);
                    request.write(data);
                } else if (/application\/x-www-form-urlencoded/.test(clientRequest.headers['content-type'])) {
                    let data = new URLSearchParams(clientRequest.body).toString();
                    request.write(data);
                    request.write(data);
                } else if (/multipart\/form-data/.test(clientRequest.headers['content-type']) && multipartFormData) {
                    multipartFormData.pipe(request);
                    multipartFormData.pipe(lengthCalculatorStream);
                    endWriting = false;
                } else {
                    //unsupported content type
                    let data = clientRequest.body || '';

                    if (Array.isArray(data)) {
                        if (data.length === 0) {
                            data = "";
                        } else {
                            data = JSON.stringify(data);
                        }
                    } else if (data instanceof Buffer) {
                        //do not modify for buffer
                    } else if (typeof data === 'object') {
                        if (Object.keys(data).length === 0) {
                            data = "";
                        } else {
                            data = JSON.stringify(data);
                        }
                    } else {
                        data = '' + data;
                    }
                    request.write(data);
                    request.write(data);
                }

            }

            if (endWriting) {
                request.end();
                lengthCalculatorStream.end();
            }
        } else {
            //pipe request body to remote
            logger.info('Request body pipe to backend');
            const lengthCalculatorStream = new LengthCalculatorStream();
            lengthCalculatorStream.on('finish', () => {
                logger.info(`Proxy body data from request body`);
                logger.info(`Total data length: ${lengthCalculatorStream.totalLength} bytes`);
            });
            clientRequest.pipe(request);
            clientRequest.pipe(lengthCalculatorStream);
        }
    });
}

