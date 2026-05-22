const FuseCore=require("../../dist/cjs/index.js");

(async () => {
     FuseCore.init({
        log: {
            logDir: './logs',
        }
    }).then(()=>{
         FuseCore.logger.info('Test');    
     });
    
})();