import registerFilter from "./filter.mjs";
import {getLangInfo, getUAInfo} from "./utils.mjs";


export default {
    init: function (instances, opts) {
        opts = opts['common'] || {};
        if (opts.expressApp) {
            registerFilter(opts.expressApp);
        }
    },
    getUAInfo,
    getLangInfo,
};