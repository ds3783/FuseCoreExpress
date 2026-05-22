import http from 'http';
import https from 'https';
import cookie from 'cookie';
import {default as CONFIG} from './config.mjs';
import {default as agentPool} from './agent.mjs';
import {default as HttpsProxyAgent} from 'better-https-proxy-agent';


let manifest = null;

export function setManifest(m) {
    manifest = m;
}

let generateHeaders = function (options, preservedHeaders) {
    let tmp = {};
    let appendHeaders = (headers, overWrite) => {
        if (!headers) {
            return;
        }
        for (let key in headers) {
            if (headers.hasOwnProperty(key)) {
                let newKey = key.toLowerCase();
                if (!overWrite && preservedHeaders.indexOf(key) >= 0) {
                    continue;
                }
                tmp[newKey] = headers[key];
            }
        }
    };
    let transform = (headers) => {
        let result = {};
        for (let key in headers) {
            if (headers.hasOwnProperty(key)) {
                let newKey = key.replace(/(^|[^a-zA-Z])([a-z])/g, function (all, dash, letter) {
                    return dash + letter.toUpperCase();
                });
                result[newKey] = headers[key]
            }
        }
        return result;
    };

    appendHeaders(CONFIG.DEFAULT_HEADERS, true);

    if (options.req) {
        try {
            delete options.req.headers['content-length'];
        } catch (ignore) {

        }
        appendHeaders(options.req.headers);
    }


    if (options['isWeb']) {
        let cookies = cookie.parse(tmp['cookie'] || '');
        tmp['accept-language'] = cookies['N1'] || 'en';

        if (cookies['token']) {
            tmp['authorization'] = cookies['token'];
        }
    }

    if (options['anonymous']) {
        delete tmp['authorization'];
    }

    if (options['noCache']) {
        delete tmp['if-modified-since'];
        delete tmp['If-None-Match'];
        tmp['cache-control'] = 'no-cache';
    }

    if (!options['passClientIP']) {
        delete tmp['x-forwarded-for'];
        delete tmp['x-real-ip'];
    }

    if (options.headers) {
        appendHeaders(options.headers);
    }
    return transform(tmp);
};


const BOUNARY_CHARACTERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
let generateBoundary = function () {
    let prefix = '----WebKitFormBoundary';
    let random = [];
    for (let i = 0; i < 16; i++) {
        random.push(BOUNARY_CHARACTERS[Math.floor(Math.random() * BOUNARY_CHARACTERS.length)]);
    }
    return prefix + random.join('');
};

let guessMimeType = function (filename) {
    if (/\.jp(e)?g$/.test(filename)) {
        return 'image/jpeg';
    }
    if (/\.png$/.test(filename)) {
        return 'image/png';
    }
    return 'application/octet-stream';
};

let resolveProxy = function (proxySetting) {
    let error = false, proxyStr;
    if (typeof resolveProxy === 'object') {
        let isHttps = /https/.test('' + proxySetting.protocol);
        let host = '' + proxySetting.host;
        let port = proxySetting.port * 1;
        if (!host || !port) {
            error = true;
        }
        let authStr = ''
        if (proxySetting.user) {
            authStr = decodeURIComponent(proxySetting.user);
            if (proxySetting.password) {
                authStr += ':' + decodeURIComponent(proxySetting.password)
            }
        }
        proxyStr = (isHttps ? 'https' : 'http') + '://' + (authStr ? authStr + '@' : '') + host + ':' + port;
    } else {
        proxyStr = '' + proxySetting;
        if (!/^http(s)?:\/\/([^:/?]+(:[^:/?]+)?@)?[^:/?]+(:\d{1,5})?$/.test(proxyStr)) {
            error = true;
        }
    }
    if (error) {
        throw new Error('Invalid proxy setting:' + JSON.stringify(proxySetting));
    }
    return proxyStr;
};


export function generateRequestParameters(options, preservedHeaders) {
    let url, agent, isHttps, server;

    options = Object.assign({}, CONFIG.DEFAULT_OPTIONS, options);
    server = options.server || 'base';
    options.timeout = options.timeout || CONFIG.DEFAULT_TIMEOUT;

    if (!options.url) {
        if (manifest) {
            url = manifest.getBackendUrl(server, options.path, options.version);
        } else {
            throw new Error('Manifest has not been initialized!');
        }
    } else {
        url = options.url;
    }
    isHttps = /^https:\/\//.test(url);

    if (options.url || options.timeout !== CONFIG.DEFAULT_TIMEOUT) {
        //set use new socket if timeout is not default timeout
        agent = (isHttps ? https : http).globalAgent;
    } else {
        agent = agentPool.getAgent(server, isHttps, CONFIG.AGENT_OPTS || {});
    }
    if (options.proxy) {
        let proxyStr = resolveProxy(options.proxy);
        let parsedProxy = new URL(proxyStr);
        let proxyObj = {
            protocol: parsedProxy.protocol,
            host: parsedProxy.hostname,
            port: parsedProxy.port * 1,
        };
        if (parsedProxy.username && parsedProxy.password) {
            proxyObj['username'] = parsedProxy.username;
            proxyObj['password'] = parsedProxy.password;
        }
        agent = new HttpsProxyAgent.Agent(Object.assign({
            keepAlive: true,
            timeout: 55000,
            maxSockets: 20,
            maxFreeSockets: 5,
            maxCachedSessions: 500
        }, CONFIG.AGENT_OPTS), proxyObj);
    }


    let method = options.method || 'GET', host = url.match(/^\w+:\/\/([^\/]+)/)[1],
        path = url.replace(new RegExp('^\\w+://' + host.replace(/\./g, '\\.')), ''), port = null;
    let queryInUrl = ['GET', 'OPTIONS', 'HEAD'].indexOf(method) >= 0;
    if (/:\d+/.test(host)) {
        port = host.match(/:(\d+)/)[1];
        host = host.match(/([^:]*):\d+/)[1];
    }
    options.headers = options.headers || {};
    //set alias
    options.reqContentType = options.reqContentType || options.dataType;
    options.resContentType = options.resContentType || options.contentType;
    options.noCache = typeof options.noCache === 'undefined' ? true : !!options.noCache;

    let query;
    query = options.data || {};


    if (options.reqContentType === 'json') {
        options.headers['content-type'] = 'application/json; charset=utf-8';
        query = JSON.stringify(query);
        if (queryInUrl) {
            query = encodeURIComponent(query);
        }
    } else if (options.reqContentType === 'binary') {
        options.headers['content-type'] = 'application/octet-stream';
    } else if (options.reqContentType === 'multipart') {
        let boundary = generateBoundary();
        options.headers['content-type'] = 'multipart/form-data; charset=utf-8; boundary=' + boundary;
        let body = [], len = 0;
        for (let key in query) {
            if (!query.hasOwnProperty(key)) {
                continue;
            }
            let value = query[key];
            if (typeof value === 'object') {
                body.push('--' + boundary);
                body.push("Content-Disposition: form-data; name=\"" + key + "\"; filename=\"" + value.name + "\"");
                body.push("Content-Type: " + guessMimeType(value.name));
                body.push('');
                body.push(value.binary);
            } else {
                body.push('--' + boundary);
                body.push("Content-Disposition: form-data; name=\"" + key + "\"");
                body.push('');
                body.push(value);
            }
        }
        body.push('--' + boundary + '--');
        for (let item of body) {
            if (typeof item === 'string') {
                len += item.length + 2;
            } else if (item && typeof item.length === 'number') {
                len += item.length + 2;
            } else {
                throw new Error('Unknown multipart form content:' + item);
            }
        }
        options.headers['Content-Length'] = '' + len;
        query = body;
    } else {
        let params = new URLSearchParams(query);
        query = params.toString();
        if (!queryInUrl && query) {
            options.headers['content-type'] = 'application/x-www-form-urlencoded';
        }
    }

    if (queryInUrl && query) {
        if (path.indexOf('?') >= 0) {
            path += '&' + query;
        } else {
            path += '?' + query;
        }
        query = '';
    }

    let headers;


    headers = generateHeaders(options, preservedHeaders);

    let reqOptions = {
        protocol: isHttps ? 'https:' : 'http:',
        host: host,
        path: path,
        method: method,
        family: 4,
        headers: headers,
        timeout: options.timeout,
        reqData: query,
        agent: agent
    };


    if (port > 0) {
        reqOptions.port = port * 1;
    }
    return {
        opts: reqOptions,
        url,
        queryInUrl,
        cname: options.cname || '',
        isHttps,
        returnStream: options.resContentType === 'stream'
    };
}

export default {
    generateRequestParameters
};