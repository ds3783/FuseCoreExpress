import FuseCore from "../../src/index.mjs";
import cluster from "node:cluster";
import path from "path";


let isWorker = cluster.isWorker;
console.log('isWorker', isWorker)

const config = {
    log: {
        path: 'logs',
        level: 'info',
        extraZipStreams: [],
        takeOverConsole: false,
    },
    manifest: {
        path: path.join('test', 'manifests'),
        name: 'prod'
    },
    isPrimaryProcess: !isWorker
};

if (!isWorker) {
    //primary process
    FuseCore.init(config).then(() => {
    console.log('FuseCore initialized.');
        let workerCnt = 1;
        let args = process.argv;
        for (const arg of args) {
            if (/WORKER_CNT/.test(arg)) {
                workerCnt = arg.replace(/^WORKER_CNT=(\d+)$/, "$1");
            }
        }
        console.log("Worker cnt", workerCnt);
        let childMsgCnt = 0;
        let childState = {};
        for (let i = 0; i < workerCnt; i++) {
            let cp = cluster.fork();
            childState[cp.process.pid + ''] = {pid: cp.process.pid, running: true};
            cp.on('message', function (msg) {
                if (msg.cmd === 'isWorker') {
                    childMsgCnt++;
                    childState['' + msg.pid]['isWorker'] = msg.isWorker;
                    // assert.ok(msg.isWorker, "Child process should know it is a worker process. ");
                }
            });
            cp.on('exit', function () {
                childState[cp.process.pid + '']['running'] = false;
            });
        }
        setTimeout(function () {
            let summary = FuseCore.monitor.getCurrentSummary('/');
            console.log('sending', {cmd: 'clusterTestResult', childMsgCnt, childState, monitorSummary: summary});
            process.send({cmd: 'clusterTestResult', childMsgCnt, childState, monitorSummary: summary});
            done();
        }, 1000);
    }).catch((e) => {
        console.log(e);
        done();
    });

} else {

    process.send({cmd: 'isWorker', pid: process.pid, isWorker});
    FuseCore.init(config).then(() => {
    console.log('FuseCore initialized.');
        FuseCore.monitor.recordCnt('test', '/', 1);
        done();
    }).catch((e) => {
        console.log(e);
        done();
    });

}

let done = function () {
    setTimeout(function () {
        console.log('Worker ' + process.pid + ' exit!');
        process.exit();
    }, 16);
}

