/**
 * Created by ds3783 on 2017/2/17.
 *
 * Monitor implement
 */

"use strict";

let lastResult = {};


export default {
    init: function (_logger, _tmpDir) {
        process.on('message', function (msg) {
            if ('nestia_web.monitor.updateResult' === msg?.cmd) {
                lastResult = msg.result;
            }
        });
    },
    backup: function () {
    },
    shutdown: function () {

    },
    getCurrentSummary: function () {

    },
    recordCnt: function (code, path, cnt) {
        process.send({
            cmd: 'nestia_web.monitor.recordCnt',
            code,
            path,
            cnt
        });
    },
    recordVal: function (code, path, val) {
        process.send({
            cmd: 'nestia_web.monitor.recordVal',
            code,
            path,
            val
        });
    },
    getExportData: function (path) {
        return lastResult[path] || [];
    }
};