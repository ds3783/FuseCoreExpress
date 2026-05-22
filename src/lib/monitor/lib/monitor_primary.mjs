/**
 * Created by ds3783 on 2017/2/17.
 *
 * Monitor implement
 */

"use strict";
import fs from 'fs';
import path from 'path';
import cluster from "node:cluster";

let cntObj = {};
let valObj = {};
let lastResult = {};
let lastExportTime = false;
let intervals = [];

const exportRecords = function () {
    lastResult = {};
    let keySet = {};
    let add = function (obj, valueGenerator) {
        for (let path in obj) {
            if (obj.hasOwnProperty(path)) {
                if (!lastResult[path]) {
                    lastResult[path] = [];
                }
                if (!keySet[path]) {
                    keySet[path] = {};
                }
                let values = obj[path];
                for (let key in values) {
                    if (values.hasOwnProperty(key)) {
                        if (!keySet[path][key]) {
                            keySet[path][key] = true;
                            lastResult[path].push(key + '=' + valueGenerator(values[key]));
                        }
                    }
                }
            }
        }
    };

    add(cntObj, (i) => {
        return i;
    });
    add(valObj, (obj) => {
        return (obj.cnt > 0 ? (obj.sum / obj.cnt) : 0);
    });
    keySet = null;
};

let resetData = function () {
    let cp = function (obj, initValueGen) {
        let target = {};
        let pathKeys = Object.keys(obj);
        for (let path of pathKeys) {
            target[path] = {};
            let detailObj = obj[path];
            let businessKeys = Object.keys(detailObj);
            for (let key of businessKeys) {
                target[path][key] = initValueGen();
            }
        }
        return target;
    };
    cntObj = cp(cntObj, function () {
        return 0;
    });
    valObj = cp(valObj, function () {
        return {cnt: 0, sum: 0};
    });

};

let logger, tmpDir, dataFile;

let backupData = function (writeLog) {
    if (!logger || !tmpDir || !dataFile) {
        return;
    }
    writeLog && logger.info('Saving monitor data...');
    try {
        fs.accessSync(tmpDir, fs.constants.W_OK);
        let fd = fs.openSync(dataFile, 'w');
        fs.writeSync(fd, JSON.stringify(
            {
                cntObj: cntObj,
                valObj: valObj,
                lastResult: lastResult,
                lastExportTime: lastExportTime
            }
        ));
        fs.closeSync(fd);
        writeLog && logger.info('Monitor data stored.');
    } catch (e) {
        logger.fatal('Monitor data save failed:' + e.message);
    }
};

const consoleLogger = {
    info: function () {
        console.log.apply(console, arguments);
    },
    warn: function () {
        console.error.apply(console, arguments);
    },
    error: function () {
        console.error.apply(console, arguments);
    }
}

const notifyWorkers = function (result) {
    let workers = cluster.workers;
    if (workers) {
        let workerArr = Object.values(workers);
        for (const worker of workerArr) {
            worker.send({
                cmd: "nestia_web.monitor.updateResult",
                result
            });
        }
    }
}

let Monitor = {
    init: function (_logger, _tmpDir) {

        let _dataFile = null;
        if (fs.existsSync(_tmpDir)) {
            _dataFile = path.join(_tmpDir, 'monitor.data');
        }
        logger = _logger || consoleLogger;
        tmpDir = _tmpDir;
        dataFile = _dataFile;

        let nextTick = 0;
        logger.info('Restoring monitor data...');
        try {
            let bakData = null;
            if (_dataFile) {
                fs.accessSync(dataFile, fs.constants.F_OK);
                bakData = fs.readFileSync(dataFile);
            }
            if (bakData) {
                bakData = JSON.parse(bakData);
                let now = (new Date()).getTime();
                if (now - bakData.lastExportTime > 120000) {
                    logger.warn('Monitor data is too old,dropped!');
                } else {
                    cntObj = bakData.cntObj || {};
                    valObj = bakData.valObj || {};
                    lastResult = bakData.lastResult || {};
                    nextTick = Math.max(60000 - now + bakData.lastExportTime, 0);
                    notifyWorkers(lastResult)
                }
            } else {
                logger.warn('Monitor data is empty!');
            }
        } catch (e) {
            logger.warn('Monitor data file doesn\'t exists or no privileged to read:' + e.message);
        }

        let execInit = function () {
            lastExportTime = (new Date()).getTime();
            exportRecords();
            resetData();
            notifyWorkers(lastResult);
            intervals.push(setInterval(function () {
                lastExportTime = (new Date()).getTime();
                exportRecords();
                resetData();
                backupData(false);
                notifyWorkers(lastResult)
            }, 60000));
        };

        if (nextTick) {
            setTimeout(function () {
                execInit();
            }, nextTick);
        } else {
            execInit();
        }

        let messageHandler = function (msg) {
            if (msg && msg.cmd) {
                switch (msg.cmd) {
                    case 'nestia_web.monitor.recordCnt':
                        Monitor.recordCnt(msg.code, msg.path, msg.cnt);
                        break;
                    case 'nestia_web.monitor.recordVal':
                        Monitor.recordVal(msg.code, msg.path, msg.val);
                        break;
                }
            }
        };
        for (const worker of Object.values(cluster.workers)) {
            worker.on('message', messageHandler);
        }
        cluster.on('online', function (worker) {
            worker.on('message', messageHandler);
        });
    },
    backup: function () {
        backupData(true);
    },
    shutdown: function () {
        for (const interval of intervals) {
            clearInterval(interval);
        }
        intervals = [];
    },
    recordCnt: function (code, path, cnt) {
        path = path || '/';
        if (!cntObj[path]) {
            cntObj[path] = {};
        }
        let cntObjWithPath = cntObj[path];
        if ('undefined' === typeof cnt) {
            cnt = 1;
        }
        cntObjWithPath[code] = (cntObjWithPath[code] || 0) + cnt;
    },
    recordVal: function (code, path, val) {
        path = path || '/';
        if (!valObj[path]) {
            valObj[path] = {};
        }
        let valObjWithPath = valObj[path];
        valObjWithPath[code] = valObjWithPath[code] || {cnt: 0, sum: 0};
        valObjWithPath[code]['cnt']++;
        valObjWithPath[code]['sum'] += val || 0;
    },
    getExportData: function (path) {
        return lastResult[path] || [];
    },
    getCurrentSummary: function (path) {

        let result = {};
        let keySet = {};
        let add = function (obj, valueGenerator) {
            for (let path in obj) {
                if (obj.hasOwnProperty(path)) {
                    if (!result[path]) {
                        result[path] = [];
                    }
                    if (!keySet[path]) {
                        keySet[path] = {};
                    }
                    let values = obj[path];
                    for (let key in values) {
                        if (values.hasOwnProperty(key)) {
                            if (!keySet[path][key]) {
                                keySet[path][key] = true;
                                result[path].push(key + '=' + valueGenerator(values[key]));
                            }
                        }
                    }
                }
            }
        };

        add(cntObj, (i) => {
            return i;
        });
        add(valObj, (obj) => {
            return (obj.cnt > 0 ? (obj.sum / obj.cnt) : 0);
        });
        keySet = null;
        return result[path] || [];
    }
};
export default Monitor;