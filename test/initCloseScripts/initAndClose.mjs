import {init,shutdown} from "../../src/index.mjs";


(async () => {
    await init({});
    setTimeout(() => {
        shutdown();
    }, 3000);
})();