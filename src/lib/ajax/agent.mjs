import https from 'https';
import http from 'http';

let agents = {};

let agentConfig = {
    keepAlive: true,
    keepAliveMsecs: 100 * 1e3,
    maxSockets: 65535,
    maxFreeSockets: 32
};

export function getAgent(backend, isHttps, extraOptions) {
    let agent = agents[backend];
    if (!agent) {
        let implModule = isHttps ? https : http;
        extraOptions = extraOptions || {};
        let options = Object.assign({}, agentConfig, extraOptions);
        agent = new implModule.Agent(options);
        agents[backend] = agent;
    }
    return agent;
}

export default {
    getAgent,
};





