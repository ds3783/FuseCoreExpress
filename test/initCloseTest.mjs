import assert from 'assert';
import child_process from "child_process";

describe('FuseCore', function () {
    describe('#init()', function () {
        it('worker should not exit', function (done) {
            this.timeout(10000);
            let worker = child_process.fork('./test/initCloseScripts/init.mjs');
            let exited = false;
            worker.on('exit', function () {
                exited = true;
            });
            setTimeout(function () {
                assert.strictEqual(false, exited);
                worker.kill("SIGHUP");
                done();
            }, 2000);
            // done();
        });
    });

    describe('#initInCjsMode()', function () {
        it('worker should not exit', function (done) {
            this.timeout(10000);
            let worker = child_process.fork('./test/initCloseScripts/cjsTest.cjs');
            let exited = false;
            worker.on('exit', function () {
                exited = true;
            });
            setTimeout(function () {
                assert.strictEqual(false, exited);
                worker.kill('SIGHUP');
                done();
            }, 2000);
            // done();
        });
    });


    describe('#initAndClose()', function () {
        it('worker should exit by it self', function (done) {
            this.timeout(10000);
            let worker = child_process.fork('./test/initCloseScripts/initAndClose.mjs');
            let exited = false;
            worker.on('exit', function () {
                exited = true;
            });
            setTimeout(function () {
                assert.strictEqual(false, exited);

            }, 2000);
            setTimeout(function () {
                assert.strictEqual(true, exited);
                done();
            }, 5000);
            // done();
        });
    });


});



