import assert from 'assert';
import fs from 'fs';
import path from 'path';
import FuseCore from "../dist/esm/index.mjs";
import {sleep} from "./misc/utils.mjs";

describe('FuseCore', function () {
    describe('logger', function () {
        describe('#info', function () {
            it('source code should be loggerTest.js', async function () {
                FuseCore.logger.info('Ensure log file exists');
                await sleep(200);
                let today = new Date();
                let dateStr = '' + today.getFullYear() + ((today.getMonth() + 1 > 9) ? today.getMonth() + 1 : '0' + (today.getMonth() + 1)) + (today.getDate() > 9 ? today.getDate() : '0' + today.getDate());
                let loggerFile = path.resolve(path.join('logs', `info.${dateStr}.log`));
                let initialStat;
                try {
                    initialStat = fs.statSync(loggerFile);
                } catch (e) {
                    if (e.code === 'ENOENT') {
                        assert.fail('Log file not exits.:' + loggerFile);
                    } else {
                        assert.fail('Failed get log file stat:' + e.message);
                    }
                    return;
                }
                FuseCore.logger.info('Write a test log');
                await sleep(200);

                //ignore old logs;
                let log = await new Promise(resolve => {
                    let stream = fs.createReadStream(loggerFile, {
                        flags: 'r',
                        encoding: "utf-8",
                        start: initialStat.size,
                    });
                    let logData = [];
                    stream.on('end', () => {
                        resolve(logData.join(''));
                    });
                    stream.on('data', (data) => {
                        logData.push(data);
                    });
                });
                assert.match(log, /^\[[\d\s-.:]+] \[info]@\(loggerTest.mjs:\d+\) - Write a test log\n?$/);
            });
            
            it('console.log should write to log file', async function () {
                FuseCore.logger.info('Ensure log file exists');
                await sleep(200);
                let today = new Date();
                let dateStr = '' + today.getFullYear() + ((today.getMonth() + 1 > 9) ? today.getMonth() + 1 : '0' + (today.getMonth() + 1)) + (today.getDate() > 9 ? today.getDate() : '0' + today.getDate());
                let loggerFile = path.resolve(path.join('logs', `info.${dateStr}.log`));
                let initialStat;
                try {
                    initialStat = fs.statSync(loggerFile);
                } catch (e) {
                    if (e.code === 'ENOENT') {
                        assert.fail('Log file not exits.:' + loggerFile);
                    } else {
                        assert.fail('Failed get log file stat:' + e.message);
                    }
                    return;
                }
                console.log('Write another test log');
                await sleep(200);

                //ignore old logs;
                let log = await new Promise(resolve => {
                    let stream = fs.createReadStream(loggerFile, {
                        flags: 'r',
                        encoding: "utf-8",
                        start: initialStat.size,
                    });
                    let logData = [];
                    stream.on('end', () => {
                        resolve(logData.join(''));
                    });
                    stream.on('data', (data) => {
                        logData.push(data);
                    });
                });
                assert.match(log, /^\[[\d\s-.:]+] \[info]@\(loggerTest.mjs:\d+\) - Write another test log\n?$/);
            });
        });


    });
});



