import {ajax as request, setRequestLogger} from './request.mjs';
import {requestAll} from './requestAll.mjs';
import {proxy, setProxyLogger} from './proxy.mjs';
import {default as config} from './config.mjs';
import {setAjaxLogger, setMonitor} from "./ajaxLogger.mjs";
import {setManifest} from "./utils.mjs";
import http from "http";
import https from "https";


export default {
    init: function (instances, opts) {
        let logger = instances['log'].getLogger();
        setAjaxLogger(logger);
        setRequestLogger(logger);
        setProxyLogger(logger);
        setManifest(instances['manifest']);
        setMonitor(instances['monitor']);
        opts = opts['ajax'] || {};
        config.DEFAULT_TIMEOUT = opts.timeout || config.DEFAULT_TIMEOUT;
        config.SLOW_LIMIT = opts.slowThreshold || config.SLOW_LIMIT;
        config.DEFAULT_HEADERS = opts.defaultHeaders || config.DEFAULT_HEADERS;
        config.AGENT_OPTS = opts.agentOptions || config.AGENT_OPTS;
        if (Object.keys(config.AGENT_OPTS).length > 0) {
            // apply agent options to global agent
            http.globalAgent.options = Object.assign(http.globalAgent.options, config.AGENT_OPTS);
            https.globalAgent.options = Object.assign(https.globalAgent.options, config.AGENT_OPTS);
        }
    },
    request,
    requestAll,
    proxy
};