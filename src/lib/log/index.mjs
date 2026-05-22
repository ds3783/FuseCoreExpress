/**
 * Created by ds3783 on 2017/5/29.
 */
"use strict";

import cleaner from './logCleaner.mjs';
import zipper from './logZipper.mjs';
import logger from './logger.mjs';

let logDir = '';

export const nullModule = {
    logger: logger.getLogger()
};

export default {
    init: function (modules, options) {
        let logOptions = options.log || {};
        logDir = logOptions.path;
        if (logDir) {
            zipper.setLogPath(logDir);
            zipper.addLogStream(logOptions.extraZipStreams || []);
            zipper.init(options);
            cleaner.setLogPath(logDir);
            cleaner.init(options);
            logger.init({
                logDir: logDir,
                level: logOptions.level || 'info',
                extraOutputStreams: logOptions.extraOutputStreams || null,
            });

        }
        let l = modules.logger = logger.getLogger();
        if (logOptions.takeOverConsole) {
            console._log = console.log;
            console._debug = console.debug;
            console._error = console.error;
            console._info = console.info;
            console._warn = console.warn;
            console._trace = console.trace;
            console.log = l.info;
            console.debug = l.debug;
            console.error = l.error;
            console.info = l.info;
            console.warn = l.warn;
            console.trace = l.trace;
        }
    },
    shutdown: function () {
        zipper.shutdown();
        cleaner.shutdown();
    },
    getLogger: logger.getLogger,
    getLogDir: function () {
        return logDir;
    }
};

