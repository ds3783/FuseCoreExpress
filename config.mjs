import * as cluster from "node:cluster";

export const DefaultConfig = {
    cache: {
        impl: 'memory', // 'memory' or 'redis'
        redis: {
            url: 'redis://localhost:6379',
            enableTls: false,
            clientOptions: {}
        }
    },
    log: {
        path: '',
        level: '',
        extraZipStreams: [],
        takeOverConsole: false,
    },
    ajax: {
        timeout: 10000,
        slowThreshold: 3000,
        defaultHeaders: {
            "X-Requested-With": "FuseCore Web component V1.0"
        }  ,
        agentOptions:{}
    },
    manifest: {
        path: '',
        name: '',
    },
    monitor: {
        prefix: '',
        suffix: '',
        mem: true,
        cpu: true,
        req404: true,
        req5xx: true,
    },
    common: {
        expressApp: null,
        listenHostname: '',
        listenPort: 3000,
    },
    isPrimaryProcess: cluster.isPrimary || cluster.isMaster
};

export default DefaultConfig;