/**
 * Created by ds3783 on 16/8/22.
 */
"use strict";

import cron from 'node-cron';
import child_process from 'child_process';
import fs from 'fs';

import path from 'path';

let logPath = '';
let logStreams = [];

const zipLog = function () {
    //Write a \n char to force rotate log file
    for (let i = 0; i < logStreams.length; i++) {
        let stream = logStreams[i];
        if (stream && stream.write) {
            stream.write("\n");
        }
    }
    fs.readdir(logPath, function (err, files) {
        if (!files) {
            return;
        }
        let cmds = [];
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let matches;
            let now = new Date();
            let date = '' + now.getFullYear() + (now.getMonth() < 9 ? '0' + (now.getMonth() + 1) : now.getMonth() + 1) + (now.getDate() < 10 ? '0' + now.getDate() : now.getDate());

            if ((matches = file.match(/^(.*[\d]{8}.*)\.log$/)) && file.indexOf(date) < 0) {
                let cmd = "tar zcf " + matches[0] + '.gz' + ' ' + file;
                cmds.push({cmd: cmd, opts: {cwd: logPath}, sourceFile: path.join(logPath, file)});
            }
        }
        const doExec = function () {
            if (cmds.length) {
                let cmd = cmds.shift();
                console.log('zipping:' + cmd.cmd);
                child_process.exec(cmd.cmd, cmd.opts, function () {
                    if (fs.existsSync(cmd.sourceFile)) {
                        fs.unlinkSync(cmd.sourceFile);
                    }
                    doExec();
                });
            }
        };
        doExec();
    });

};

let cronTask = null;

export default {
    setLogPath: function (path) {
        logPath = path;
    },
    addLogStream: function (stream) {
        if (!stream) {
            return;
        }
        if (stream instanceof Array) {
            logStreams = logStreams.concat(stream);
        } else {
            logStreams.push(stream);
        }
    },
    init: function (opts) {
        
        if (opts.isPrimaryProcess) {
            //  cluster support: only set cron task on primary process
            if (cronTask) {
                cronTask.destroy();
            }
            cronTask = cron.schedule('0 1 * * *', function () {
                console.log('running zip log task');
                try {
                    zipLog();
                } catch (e) {
                    console.log(e);
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