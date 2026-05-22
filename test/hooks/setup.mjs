import path from "path";
import crypto from "crypto";
import FuseCore from "../../dist/esm/index.mjs";

const config = {
    log: {
        path: 'logs',
        level: 'info',
        extraZipStreams: [],
        extraOutputStreams: {
            info: process.stdout,
            error: process.stderr,
        },
        takeOverConsole: true,
    },
    manifest: {
        path: path.join('test', 'manifests'),
        name: 'prod'
    },
    ajax: {
        agentOptions: {
            secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
        }
    }
};

export const mochaHooks = {
    beforeAll(done) {
        // do something before every test
        console.log('FuseCore going to initialize.');
        FuseCore.init(config).then(() => {
            console.log('FuseCore initialized.');
            done();
        }).catch((e) => {
            console.log(e);
            done(e);
        });
    },
    afterAll(done) {
        // do something before every test
        console.log('FuseCore going to shutdown.');
        FuseCore.shutdown();
        done();
    }
};