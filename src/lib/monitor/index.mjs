/**
 * Created by ds3783 on 2017/2/17.
 *
 * Monitor API
 */


import cpu, {default as CPU} from './lib/cpu.mjs';
import {default as Primary} from './lib/monitor_primary.mjs';
import {default as Worker} from './lib/monitor_worker.mjs';

import {default as onFinished} from 'on-finished';

let logger = null;

let prefix = '';
let suffix = '';
let intervals = [];

let Monitor = null;

let toExport = {
    recordCnt: function (code, path, cnt) {
        Monitor.recordCnt(prefix + code + suffix, path, cnt);
    },
    recordCntBatch: function (obj, path) {
        obj = obj || {};
        for (let prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                Monitor.recordCnt(prop, path, (obj[prop] * 1) || 1);
            }
        }
    },
    recordVal: function (code, path, val) {
        Monitor.recordVal(prefix + code + suffix, path, val);
    },
    recordValBatch: function (obj, path) {
        obj = obj || {};
        for (let prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                Monitor.recordCnt(prop, path, (obj[prop] * 1) || 1);
            }
        }
    },
    getCurrentSummary: function (path) {
        return Monitor.getCurrentSummary(path);
    },
    getCpuNum: function () {
        return CPU.num();
    },
    getCpuUsage: function () {
        return CPU.usage();
    },
    init: function (moduleInstances, options) {
        //cluster support
        if (options.isPrimaryProcess) {
            Monitor = Primary;
        } else {
            Monitor = Worker;
        }
        logger = moduleInstances['log'];

        Monitor.init(logger.getLogger(), logger.getLogDir());

        let monitorOptions = options['monitor'] || {};

        const app = (options['common'] || {})['expressApp'];
        
        prefix = monitorOptions.prefix || '';
        suffix = monitorOptions.suffix || '';
        prefix = prefix ? prefix + '_' : '';
        suffix = suffix ? suffix + '_' : '';


        if (app) {
            app.use(function (req, res, next) {
                if (
                    /healthcheck.html/.test(req.path)
                    || /Monitor.jsp$/.test(req.path)
                ) {
                    //ignore healthckeck and monitor data crawler
                    next();
                    return;
                }

                req.__startTick = process.hrtime();
                const logMonitor = function () {
                    let timeSpan = process.hrtime(req.__startTick);
                    let timeSpan2 = timeSpan[0] * 1000 + timeSpan[1] / 1e6;
                    Monitor.recordVal('all_req_Time', '/', timeSpan2);
                    Monitor.recordCnt('all_req_Count');
                    if (monitorOptions.req404) {
                        if (res.statusCode === 404 || res.getHeader('X-Error') === '404') {
                            Monitor.recordCnt('404_req_Count');
                        }
                    }
                    if (monitorOptions.req5xx) {
                        if (res.statusCode > 499 && res.statusCode < 600) {
                            Monitor.recordCnt('5xx_req_Count');
                        }
                    }
                };
                onFinished(res, logMonitor);
                next();
            });

            app.use('/:path/Monitor.jsp', function (req, res) {
                res.status(200);
                res.header("Cache-Control", "no-cache, no-store, must-revalidate");
                res.header("Pragma", "no-cache");
                res.header("Expires", 0);
                res.header("Content-Type", "text/plain");
                res.send(Monitor.getExportData(req.params['path']).join('\n') + '\n');
            });
            app.use('/Monitor.jsp', function (req, res) {
                res.status(200);
                res.header("Cache-Control", "no-cache, no-store, must-revalidate");
                res.header("Pragma", "no-cache");
                res.header("Expires", 0);
                res.header("Content-Type", "text/plain");
                res.send(Monitor.getExportData('/').join('\n') + '\n');
            });
        }

        if (options.isPrimaryProcess) {
            if (monitorOptions['cpu']) {
                CPU.init();
            }

            let monitorEverySecond = monitorOptions.cpu || monitorOptions.mem;
            if (monitorEverySecond) {
                intervals.push(setInterval(function () {
                    if (monitorOptions.mem) {
                        let memUsage = process.memoryUsage();
                        Monitor.recordVal('mem_rss_usage_Value', '/', Math.floor(memUsage.rss / 1024) / 1024);
                        Monitor.recordVal('mem_heap_usage_Value', '/', Math.floor(memUsage.heapUsed / 1024) / 1024);
                        Monitor.recordVal('mem_heap_size_Value', '/', Math.floor(memUsage.heapTotal / 1024) / 1024);
                    }
                    if (monitorOptions.cpu) {
                        Monitor.recordVal('cpu_usage_Value', '/', CPU.usageAvg());
                    }
                }, 1000));
            }
        }
    },
    shutdown: function () {
        for (const interval of intervals) {
            clearInterval(interval);
        }
        intervals = [];
        cpu.shutdown();
        Monitor.backup();
        Monitor.shutdown();
    }
};

export default toExport;

