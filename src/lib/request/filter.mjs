/**
 * Created by ds3783 on 2017/4/17.
 */
const getIp = function (req) {
    /*
     * 1. x-forward-for  'A, B, C, D' search sequence: D->A
     * 2. x-real-ip
     * 3. remoteAddress
     * 
     * */
    let isLocal = function (ip) {
        /*
         * 192.168.*.* considered as outer network ips,
         * due to we haven't use that ip segment in our server cluster.
         * */
        return /^(10\.(\d{1,2}|1\d{2}|2([0-4]\d|5[0-5]))\.|172\.(1[7-9]|2[0-9]|3[01])\.|192\.168\.).*$/.test(ip);
    };
    let ips = [];
    let fwd = req.ips || [];
    if (fwd.length > 0) {
        ips = ips.concat(fwd.reverse());
    }
    if (!!req.headers['x-real-ip']) {
        ips.push(req.headers['x-real-ip']);
    }
    ips.push(req._remoteAddress);
    for (let ip of ips) {
        if (ip && !isLocal(ip)) {
            return ip;
        }
    }
    return '';
};


export function filter(req, res, next) {
    let ip = getIp(req);
    if (!!ip) {
        //ip property is a readOnly attribute,but getter has a higher priority.
        req.__defineGetter__("ip", function () {
            return ip;
        });
    }
    //x-original-url header is assambled and proxied by nginx
    req.__defineGetter__("realUrl", function () {
        return req.get('x-original-url') || '';
    });

    next();
}

export default function registerFilter(app) {
    if (app){
        app.use(filter);
    }
}