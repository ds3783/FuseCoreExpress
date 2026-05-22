import assert from 'assert';
import FuseCore from "../dist/esm/index.mjs";
import {sleep} from "./misc/utils.mjs";
import child_process from "child_process";

describe('FuseCore', function () {
    describe('monitor', function () {
        describe('#cluster', function () {
            it('child process should count correctly', async function () {
                let workerCnt = 4;
                let cp = child_process.fork("test/clusterTest/monitorWorker.mjs", ['WORKER_CNT=' + workerCnt]);
                let testResult = null;
                cp.on('message', function (result) {
                    if (result.cmd === 'clusterTestResult') {
                        console.log('test result', JSON.stringify(result));
                        testResult = result;
                    }
                });
                cp.on('exit', function () {
                    console.log('test process exit');
                    cp.kill();
                })
                await new Promise(async (resolve, reject) => {
                    let timeout = Date.now() + 3000;
                    while (Date.now() < timeout) {
                        if (typeof cp.exitCode === 'number') {
                            resolve();
                            return;
                        }
                        await sleep(100);
                    }
                    assert.fail("Test process execution timeout!");
                    reject();
                })
                console.log('testResult', testResult);
                assert.notStrictEqual(testResult, null, "Test result should not be null");
                assert.strictEqual(testResult.childMsgCnt, workerCnt, "All workers should send a message");
                let states = Object.values(testResult.childState);
                for (const state of states) {
                    assert.ok(state.pid > 0, 'Worker should have a pid')
                    assert.ok(state.isWorker, 'Worker should known it is a worker ' + state.pid);
                    assert.ok(!state.running, 'Worker should exit after test ' + state.pid);
                }
                let summary = testResult.monitorSummary;
                assert.ok(summary && summary.length, 'Should have monitor data.');
                let expectation = null;
                for (const r of summary) {
                    if (/^test=/.test(r)) {
                        expectation = r.replace(/^test=(\d+)$/, "$1") * 1;
                    }
                }
                assert.notStrictEqual(expectation, null, "Cannot found count in summary");
                assert.strictEqual(expectation, workerCnt, "Monitor count should be equal to worker Cnt");


            });
        });


    });
});



