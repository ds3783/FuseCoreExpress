let defaultConfig = {
    SLOW_LIMIT: 50,
    DEFAULT_TIMEOUT: 800,
    DEFAULT_HEADERS: {
        'x-request-with': 'FuseCore Web Server 1.0',
        'accept': '*/*',
        'accept-encoding': 'identity'
    },
    DEFAULT_OPTIONS: {
        passClientIP: true,
    } ,
    AGENT_OPTS:{}

};


let toExport = {
    ...defaultConfig,
    getDefaultRet: function () {
        return {
            ok: false,
            status: 0,
            message: '',
            error: null,
            data: {},
            raw: null,
            headers: null,
            totalCount: null
        };
    }
}

const preservedProperties = ['getDefaultRet'];

let handler = {
    get(target, property) {
        return target[property];
    },
    set(target, property, value) {
        if (preservedProperties.includes(property)) {
            return target[property];
        }
        target[property] = value;
        return value;
    }

}

export default new Proxy(toExport, handler);