/**
 * Created by ds3783 on 16/8/22.
 */
"use strict";

import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

let logPath = '';

const skippedDays = 15;

const logClean = function () {
    console.log('clean start');
    let now = new Date();
    now.setHours(0);
    now.setMinutes(0);
    now.setSeconds(0);
    let skipTime = skippedDays * 86400 * 1000;
    fs.readdir(logPath, function (err, files) {
        if (!files) {
            return;
        }
        let abandoned = [];
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let matches;

            if ((matches = file.match(/^.*[^\d]([\d]{8})([^\d].*)?$/))) {
                let dateStr = matches[1];
                let dateParams = dateStr.match(/^(\d{4})(\d{2})(\d{2})$/);
                if (dateParams) {
                    let fileDate = new Date(dateParams[1], dateParams[2] - 1, dateParams[3], 0, 0, 0);
                    if (now.getTime() - fileDate.getTime() > skipTime) {
                        abandoned.push(path.join(logPath, file));
                    }
                }
            }

            if ((matches = file.match(/^.*[^\d]([\d]{4}[^\d][\d]{2}[^\d][\d]{2})([^\d].*)?$/))) {
                let dateStr = matches[1];
                let dateParams = dateStr.match(/^(\d{4})[^\d](\d{2})[^\d](\d{2})$/);
                if (dateParams) {
                    let fileDate = new Date(dateParams[1], dateParams[2] - 1, dateParams[3], 0, 0, 0);
                    if (now.getTime() - fileDate.getTime() > skipTime) {
                        abandoned.push(path.join(logPath, file));
                    }
                }
            }
        }
        for (let idx in abandoned) {
            if (fs.existsSync(abandoned[idx])) {
                fs.unlinkSync(abandoned[idx]);
                console.log('clean :' + abandoned[idx]);
            }
        }
    });
    console.log('log cleaning complete');

};

let cronTask = null;

export default {
    setLogPath: function (path) {
        logPath = path;
    },
    init: function (opts) {
        if (opts.isPrimaryProcess) {
            //  cluster support: only set cron task on primary process
            if (cronTask) {
                cronTask.destroy();
            } 
            
            cronTask = cron.schedule('0 2 * * *', function () {
                console.log('running clean log task');
                try {
                    logClean();
                } catch (e) {
                    console.log(e)
                }
            });
        }
    },
    shutdown: function () {
        if (cronTask) {
            cronTask.destroy();
        }
    }
};
