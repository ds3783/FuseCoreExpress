import {init} from "../../dist/esm/index.mjs";

(async () => {
    await init({
        log: {
            logDir: './logs',
        }
    });

})();