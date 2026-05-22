/**
 * Created by ds3783 on 2017/5/29.
 */
"use strict";

import tracer from 'tracer';

const logFormat = '[{{timestamp}}] [{{title}}]@({{file}}:{{line}}) - {{message}}';
const dateFormat = 'yy-mm-dd HH:MM:ss.L';

// Default logger using console methods before init is called
let logger = {
    trace: function () {
        console.trace.apply(console, arguments);
    },
    debug: function () {
        console.debug.apply(console, arguments);
    },
    info: function () {
        console.info.apply(console, arguments);
    },
    warn: function () {
        console.warn.apply(console, arguments);
    },
    error: function () {
        console.error.apply(console, arguments);
    },
    fatal: function () {
        console.error.apply(console, arguments);
    },
    slow: function () {
        console.log.apply(console, arguments);
    }
};


let init = function (opts) {
    let logDirectory = opts.logDir;
    let extraStreams = {
        info: function (data) {
            if (opts.extraOutputStreams?.info) {
                if (Array.isArray(opts.extraOutputStreams.info)) {
                    for (const writer of opts.extraOutputStreams.info) {
                        writer.write(data.rawoutput);
                    }
                } else {
                    opts.extraOutputStreams.info.write(data.rawoutput);
                }
            }
        },
        error: function (data) {
            if (opts.extraOutputStreams?.error) {
                if (Array.isArray(opts.extraOutputStreams.error)) {
                    for (const writer of opts.extraOutputStreams.error) {
                        writer.write(data.rawoutput);
                    }
                } else {
                    opts.extraOutputStreams.error.write(data.rawoutput);
                }
            }
        }
    };
    let infoLogger = tracer.dailyfile({
        root: logDirectory,
        format: logFormat,
        dateformat: dateFormat,
        allLogsFileName: 'info',
        stackIndex: 2,
        level: opts.level,
        transport: extraStreams.info || null,
    });
    let errorLogger = tracer.dailyfile({
        root: logDirectory,
        format: logFormat,
        dateformat: dateFormat,
        allLogsFileName: 'error',
        stackIndex: 2,
        level: 'error',
        transport: extraStreams.error || null,
    });
    let slowLogger = tracer.dailyfile({
        root: logDirectory,
        format: logFormat,
        dateformat: dateFormat,
        allLogsFileName: 'slow',
        stackIndex: 2,
        level: 'info'
    });

    // let infoLogger = log4js.getLogger(opts.level);
    // let errorLogger = log4js.getLogger('error');
    // let slowLogger = log4js.getLogger('slow');
    /*infoLogger.setLevel('info');
    errorLogger.setLevel('error');
    slowLogger.setLevel('info');*/

    let loggers = [infoLogger, errorLogger];


    let execute = function (type, args) {
        for (let i = 0; i < loggers.length; i++) {
            loggers[i][type].apply(loggers[i], args);
        }
    };

    let exps = {
        trace: function () {
            execute('trace', arguments);
        },
        debug: function () {
            execute('debug', arguments);
        },
        info: function () {
            execute('info', arguments);
        },
        warn: function () {
            execute('warn', arguments);
        },
        error: function () {
            execute('error', arguments);
        },
        fatal: function () {
            execute('error', arguments);
        },
        slow: function () {
            slowLogger.info.apply(slowLogger, arguments);
        }
    };
    logger = exps;
    return exps;
};

export default {
    init: function (opts) {
        return init(opts);
    },
    getLogger: function () {
        return logger;
    }
};
