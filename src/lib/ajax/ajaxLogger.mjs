import {default as CONFIG} from './config.mjs';

let voidFunc = function () {
};
let logger = null, monitor = {
    recordVal: voidFunc,
    recordCnt: voidFunc()
};

export function setAjaxLogger(l) {
    logger = l;
}

export function setMonitor(m) {
    monitor = m;
}

export default function AjaxLogger() {

    this.id = '' + (new Date()).getTime() + Math.floor(Math.random() * 1e6);

    this.logStart = function (reqOptions) {
        this.opts = reqOptions;
        let opts = reqOptions.opts;
        logger && logger.info('AJAX[' + this.id + '] start ' + opts.method + ' url:' + reqOptions.url);
        this.startTick = process.hrtime();

        if (reqOptions.cname) {
            this.monitorPath = reqOptions.cname;
        } else {
            let path = opts.path;
            path = path.replace(/\?.*$/, '');
            path = path.replace(/^.*\/v\d+(\.\d+)?\//g, '');
            path = path.replace(/\/[A-Z0-9]+(\/|$)/g, '/');
            path = path.replace(/\/\//g, '/');
            path = path.replace(/^\//, '');
            path = path.replace(/\/$/, '');
            path = path.replace(/[^a-zA-Z0-9$]/g, '_');
            this.monitorPath = path;
        }
    };
    this.logSuccess = function (data) {
        this.timeSpan = process.hrtime(this.startTick);
        //ms
        let timeSpan = this.timeSpan[0] * 1000 + this.timeSpan[1] / 1e6;
        let $this = this;
        process.nextTick(function () {
            let reqOpts = $this.opts;
            let opts = reqOpts.opts;
            logger && logger.info('AJAX[' + $this.id + '] success ' + opts.method + ' url:' + reqOpts.url + ' in ' + timeSpan + 'ms' + ' statusCode:' + data.status + (typeof data.raw === 'string' ? ' length:' + data.raw.length + ' bytes' : ''));
            monitor.recordVal('api_success_Time', '/', timeSpan);
            monitor.recordCnt('api_success_Count');
            monitor.recordVal('api_success_Time', opts.host, timeSpan);
            monitor.recordCnt('api_success_Count', opts.host);
            monitor.recordVal($this.monitorPath + '_Time', opts.host, timeSpan);
            monitor.recordCnt($this.monitorPath + '_Count', opts.host);
            if (timeSpan > CONFIG.SLOW_LIMIT) {
                $this.writeSlowLog(timeSpan, data);
            }
        });
    };
    this.logFail = function (opts, data) {
        this.timeSpan = process.hrtime(this.startTick);
        let timeSpan = this.timeSpan[0] * 1000 + this.timeSpan[1] / 1e6;
        let $this = this;

        process.nextTick(function () {
            let reqOpts = $this.opts;
            let opts = reqOpts.opts;
            logger && logger.error('AJAX[' + $this.id + '] fail ' + opts.method + ' url:' + opts.protocol + '//' + opts.host + opts.path + ' in ' + timeSpan + 'ms' + ' statusCode:' + data.status + (typeof data.raw === 'string' ? ' length:' + data.raw.length + ' bytes' : ''));
            if (data.message) {
                logger && logger.error('error message:' + data.message);
            }
            if (opts) {
                logger && logger.error('request options:', opts);
            }
            if (data.headers) {
                logger && logger.error('response headers:', data.headers);
            }
            if (data.raw) {
                if (typeof data.raw === 'string') {
                    logger && logger.error('response content:\n' + (data.raw.length > 1024 ? data.raw.substring(0, 1024) : data.raw));
                } else if (data.raw instanceof Buffer) {
                    logger && logger.error('response content:\n' + (data.raw.length > 1024 ? data.raw.subarray(0, 1024).toString() : data.raw));
                }
            }
            monitor.recordVal('api_err_Time', '/', timeSpan);
            monitor.recordCnt('api_err_Count');
            monitor.recordVal('api_err_Time', opts.host, timeSpan);
            monitor.recordCnt('api_err_Count', opts.host);
            monitor.recordVal($this.monitorPath + '_Time', opts.host, timeSpan);
            monitor.recordCnt($this.monitorPath + '_Fail', opts.host);
            if (timeSpan > CONFIG.SLOW_LIMIT) {
                $this.writeSlowLog(timeSpan, data);
            }
        });

    };

    this.writeSlowLog = function (timeSpan, data) {
        if (this.slowLogWritten) {
            return;
        }
        let log = [];
        let reqOptions = this.opts;

        let opts = reqOptions.opts;
        log.push('timeout' === timeSpan ? '>' + opts.timeout + 'ms' : timeSpan + 'ms');
        log.push(reqOptions.url.replace('/\?.*$/', ''));
        log.push(opts.method);
        let query = opts.path.indexOf('?') >= 0 ? opts.path.replace('/^.*\?/', '') : '';
        if (query) {
            log.push(query);
        } else {
            log.push('-');
        }
        if (typeof data !== 'undefined' && data && data.status) {
            log.push('"' + data.status + '"');
        } else {
            log.push('"-"');
        }
        logger && logger.slow(log.join(' '));
        this.slowLogWritten = true;
    };

    this.logTimeout = function () {
        let $this = this;
        process.nextTick(function () {
            $this.writeSlowLog('timeout');
        });
    };
};