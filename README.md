# FuseCore - Express.js Development Toolkit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**FuseCore** - A comprehensive Express.js toolkit that provides essential web development utilities including caching, logging, monitoring, AJAX handling, and more. Built with MIT open source license.

## Documentation

- 📚 [Docs index](docs/README.md)
- 📖 Per-module API reference: [lifecycle](docs/api/lifecycle.md) · [cache](docs/api/cache.md) · [log](docs/api/log.md) · [request](docs/api/request.md) · [manifest](docs/api/manifest.md) · [monitor](docs/api/monitor.md) · [ajax](docs/api/ajax.md)
- 🌐 [OpenAPI 3.1 spec for the Monitor HTTP endpoints](docs/openapi/fusecore-monitor.yaml)

## About the Encrypted Build

This repository is **public** and MIT-licensed — the source under `src/` is the source of truth.

`dist-encrypted/` and `dist-obfuscated/` exist for one specific reason: to prevent downstream tooling — including LLM-based code assistants that get pointed at `node_modules` — from drawing incorrect conclusions about behavior from minified or machine-transformed JavaScript. They are **not** an access-control or secrecy mechanism. If you want to understand how FuseCore works, read [`src/`](src/) and the [API reference](docs/api/), not the bundled output.

### init options

```

{
    common: {
        expressApp: null,
        listenHostname: '',
        listenPort: 3000,
    },
    cache: {
        impl: 'memory', // 'memory' or 'redis'
        redis: {
            url: 'redis://localhost:6379',
            connectTimeout: 10000,
            commandTimeout: 5000,
            enableTls: false,
            clientOptions: {}
        }
    },
    log: {
        path: '',
        level: '',
        extraZipStreams: [],
        takeOverConsole: false,
        extraOutputStreams: {
            info: process.stdout,
            error: process.stderr,
        },
    },
    ajax: {
        timeout: 10000,
        slowThreshold: 3000,
        defaultHeaders: {
            "X-Requested-With": "FuseCore Web component V1.0"
        },
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
    isPrimaryProcess: cluster.isPrimary || cluster.isMaster
}

```

* common.expressApp           (object) optional,Express.app object.
* common.listenHostname           (string) optional, hostname or ip http server listens on, used for config server callback.
* common.listenPort           (number) optional,port number http server listens on, used for config server callback.
* cache.impl            (string) optional, cache implementation, 'memory' or 'redis', default is memory.
* cache.redis.url       (string) optional, Redis connection URL, default is 'redis://localhost:6379'.

* cache.redis.enableTls       (boolean) optional, enable TLS/SSL for Redis connection, default is false.
* cache.redis.clientOptions   (object) optional, additional Redis client options.
* log.path              (string) optional, directory to save log files.
* log.level             (string) optional, minimal level written to log file,default is info.
* log.extraZipStreams    (array) optional, streams for access log.
* log.takeOverConsole    (bool) optional, default false, indicate log module take over system console, thus all console message will be pipe to log file.
* log.extraOutputStreams (Object) optional, default null, extra log output stream, should be {info:[...Writable],error:[...Writable]}.
* ajax.timeout          (number) optional, default timeout in millisecond, default is 10000.
* ajax.slowThreshold          (number) optional, default slow log time limit in millisecond, all backend response time greater than limit will be logged to slow log file, default value is 50.
* ajax.defaultHeaders          (object) optional, default headers send to backend, default value is {'x-requested-with':'FuseCore Web Server 1.0'}.
* ajax.agentOptions          (object) optional, extra agent options will pass to http/https agent, also will applied to globalAgent.
* manifest.path          (string) optional, directory contain manifest file.
* manifest.name         (string) optional, manifest name to load.

* monitor.prefix         (string) optional, prefix of all monitor keys.
* monitor.suffix         (string) optional, suffix of all monitor keys.
* monitor.mem         (bool) optional, auto monitor memory usage, default is false.
* monitor.cpu         (bool) optional, auto monitor cpu usage, default is false.
* monitor.req404         (bool) optional, monitor 404 requests, default is false.
* monitor.req5xx         (bool) optional, monitor 5xx requests, default is false.
* isPrimaryProcess         (bool) optional, indicate current process is primary in cluster mode, monitor module will act differently when run as a worker process. 



## Monitor

📖 Full API reference: [docs/api/monitor.md](docs/api/monitor.md)
🌐 HTTP endpoint contract: [docs/openapi/fusecore-monitor.yaml](docs/openapi/fusecore-monitor.yaml)

### Usage:

#### Init:
@deprecated

var FuseCore = require('fuse-core-express');
//this line must @ top ,before any routes or app filters.
app.use(FuseCore.requestFilter());

.....


var Monitor = FuseCore.monitor;
Monitor.init(configObj);

#### Monitor Config:
{
    app: Express.app object (obj,required)
    prefix: monitor default prefix (string,optional)
    suffix: monitor default suffix (string,optional)
    mem: monitor memory usage (boolean,optional)
    cpu: monitor cpu usage (boolean,optional)
    mon404: monitor 404 response (boolean,optional)
    mon5xx: monitor 5xx response (boolean,optional)
    monitorPath: the path for express which remove graph drawer used to get monitor indicators and values
}


#### Request module

📖 Full API reference: [docs/api/request.md](docs/api/request.md)

#### Request filter
1. Used to adept nestia ip rule,when using request.ip property.
1. add req.realUrl property presents the url send to nginx.


#### Request Utils
Provides function to resolve request headers,such as accept-language or user-agent.

##### getUAInfo

param: 

* req: express request object

return:
```
 {
     isBot: false,
     isWinPhone: false,
     isIPhone: false,
     isIPad: false,
     isAndroid: false,
     isAndroidTablet: false,
     isTablet: false,
     isOtherMobile: false,
     isMobile: false,
     isWechatMiniProg: false,
     platform: "windows" | "ios" | "android" | "linux" | "macos" | "whatsapp" | "compatible" | "unknown",
     platformVersion: "10.3.1",
     browser: "msie" | "opera" | "firefox" | "chrome" | "facebook" | "weixin" | "safari" | "unknown",
     browserVersion: "10.3.1"
 }
```

##### getLangInfo

param: 

* req: express request object
* is4PC: true means client is requesting a web page for PC not mobile device.

return:

```
 {
     languages: {
         "zh-CN": "0,8",
         "en": "0,6"
     },
     primaryLanguage: ["zh-CN"],
     isEnglish: false,
     lang: "zh-cn" | "en"
 }
```


#### Log

📖 Full API reference: [docs/api/log.md](docs/api/log.md)

1. provide an logger by using getLogger 
1. automatically zip logs
1. automatically removes oldlogs
1. Requires init
1. FuseCore.logger's method can be called at any time, but it won't output any data until init finished.

init options:

```
{
       dir:path.join(__dirname,'/../logs'),
       streams:FileStreamRotator.getStream({...}) | [FileStreamRotator.getStream({...})]
}
```

Usage Example:

```
FuseCore.logger.info('some text',someObject);

```

#### Manifest

📖 Full API reference: [docs/api/manifest.md](docs/api/manifest.md)

```
let FuseCore=require('fuse-core-express');
let manifest=FuseCore.manifest;

let value=manifest.get('prop1.prop2.prop3');
......
```

#### Ajax

📖 Full API reference: [docs/api/ajax.md](docs/api/ajax.md)

Ajax API

###### Request Options

demo: 
```

{
    server:'lottery',
    version:'v5.0'
    path:'/toto/broadcast'
    data:{
        key1:1234,
        key2:5678
    },
    method:'POST',
    timeout:800,
    reqContentType:'form',
    resContentType:'json',
    headers:{
        SomeUserDefinedHeader:'this will pass to server'
    },
    isWeb:true,
    anonymous:true,
    cname:'toto_broadcast',
    passClientIP:false,
    req:req,
    res:res
}

```

* server:   (string) (required) Server code defined in manifest.
* version:  (string) (optional) Version to replace '${version}' part in url.
* path:     (string) (required) Api path apart from url defined in manifest.
* data:     (object) (optional) Data will send to server.It should be a simple object.
* method:   (string) (optional) Http method,default is 'GET'.
* timeout:  (number) (optional) Timeout (microseconds) before server complete response,default is defined in config or init option DEFAULT_TIMEOUT.
* reqContentType (deprecated alias dataType): (string) (optional) request data format,only support 'json' and 'form'(default).
* resContentType (deprecated alias contentType): (string) (optional) Content format.If contentType set 'json' or server response with header 'content-type:application/json', response body will be decode automatically.
* headers:  (object) (optional) Headers passed to server.Note:if req object is set,most of req.headers' property will passed to backend,no need to redefine headers in this option.
* isWeb:    (bool) (optional) If true, and exists cookie named 'N1',then cookie N1's value will replace default Accept-Language value.Default is false.
* anonymous: (bool) (optional) If false, and exists cookie named 'token',then a header named 'Authorization' will be set with value of cookie 'token'.
* noCache: (bool) (optional) If true, headers named 'If-Modified-Since','If-None-Match' will be removed from header ,and 'Cache-Control' will be set 'no-cache'. Default is true.
* passClientIP: (bool) (optional) If true, headers ('X-Forwarded-For','X-Real-IP') will be passed to server. Default is true.
* req:      (obj) (optional) (*required by proxy) By default,most of headers in req will pass to backend request.In proxy method,request's body stream will piped to backend request.
* res:      (obj) (unnecessary)(*required by proxy) Proxy will handle response,when reject happened.Only if ret.status === 0 ,proxy don't handle response,you should end response, such as res.status(500).end() .

###### Response Data (also as reject error)

```

{
    ok: false,
    status: 0,
    message: '',
    error: null,
    data: {},
    raw: null,
    headers: null,
    totalCount: null,
    duration: [0, 123000]
}

```

* ok:       (bool) indicates request is successful.
* status:   (number) http response code from backend server.
* message:  (string) error message when exception or error happened.
* error:    (Error) Error object,if exists.
* data:     (*) parsed server response content.Object if content-type option set "json",string if content-type set something else. 
* raw:      (string) original server response text,null when calling proxy method.
* headers:  (object) response headers.
* duration  (array) \[seconds,nanoseconds\], time used from request start to finish.
* totalCount: (number) same value of response's headers\["X-Total-Count"\],null if header not exists.


##### Ajax.request

```
FuseCore.ajax.request({
        server: 'property',
        version: 'v4.6',
        timeout: 3000,
        path: path,
        method: 'POST',
        isWeb:true,
        req: req, 
        performance: false,
        proxy: 'http://someuser:password@127.0.0.1:7666',
        headers: {
            'origin': 'https://property-staging.nestia.com'
        }
    }).then((data) => {
        res.render('somepage',data.data);
    }, (err) => {
        req.app.locals.logger.error('error request backend API:' + err.message, err);
        if (err.status) {
            res.status(err.status).end();
        }else{
            res.status(500).end();
        }
    });
```

##### Ajax.proxy

```
FuseCore.ajax.proxy({
        server: 'property',
        path: path,
        method: 'POST',
        isWeb:true,
        req: req,
        res: res,
        headers: {
            'origin': 'https://property-staging.nestia.com'
        }
    }).then((data) => {
    }, (err) => {
        FuseCore.logger.error('error upload property image:' + err.message, err);
        if (!err.status) {
            res.status(500).end();
        }
    });
```

##### Ajax.requestAll

* This method is a little like Promise.all
* When one of requests fails,you will always get a resolve callback, which is different from Promise.all.
* You can use data\[n\].ok to check whether request fails, and also you can get status, and raw data if exists.

```
FuseCore.ajax.request([
    {
        server: 'property',
        version: 'v4.6',
        timeout: 3000,
        path: '/nearby'
    },
    {
        server: 'news',
        version: 'v4.8',
        path: '/news'
    }
]).then((datas) => {
        let propertyData=datas[0];
        let newsData=datas[1];
        
        //assume property backend never fails.
        if(!newsData.ok){
            //news api fails
            res.render('onlyProperty',propertyData.data);        
        }else{        
            res.render('fullContent',{property:propertyData.data,news:newsData.data});
        }
    });
```

#### Cache

📖 Full API reference: [docs/api/cache.md](docs/api/cache.md)

FuseCore supports two cache implementations: memory cache (memory) and Redis cache (redis).

##### Memory Cache (Default)

```javascript
let FuseCore = require('fuse-core-express');

// Initialize with memory cache
await FuseCore.init({
    cache: {
        impl: 'memory'
    }
});

let cache = FuseCore.cache;
// Set a cache
// timeout is numeric represents seconds, default value is 300 seconds.
// when timeout is negative number, the cache record will never expire.
await cache.set('propName', 'propValue', 30);

// Get value
let val = await cache.get('propName');
console.log(val); // 'propValue'

// Memory cache cleanup has 60 seconds deviation
setTimeout(async function(){
    let val = await cache.get('propName');
    console.log(val); // should be null 
}, 30 * 1000 + 60000);

// Setting null value deletes the key
await cache.set('anotherPropName', 'anotherPropValue', 30);
await cache.set('anotherPropName', null, 30); // This deletes the key

let val = await cache.get('anotherPropName');
console.log(val); // null
```

##### Redis Cache

Use Redis as cache storage, supporting distributed caching and persistence.

**Configure Redis Cache:**

```javascript
let FuseCore = require('fuse-core-express');

// Initialize with Redis cache
await FuseCore.init({
    cache: {
        impl: 'redis',
        redis: {
            url: 'redis://localhost:6379',           // Redis connection URL
            enableTls: false,                        // Enable TLS/SSL connection
            clientOptions: {                         // Additional Redis client options
                // Optional configuration, such as password, database, etc.
                // password: 'your-password',
                // database: 0
            }
        }
    }
});

// Example with TLS enabled
await FuseCore.init({
    cache: {
        impl: 'redis',
        redis: {
            url: 'redis://redis-server:6380',        // Redis server URL
            enableTls: true,                         // Enable TLS/SSL connection
            clientOptions: {
                // Additional TLS options if needed
                // password: 'your-password',
                // database: 0
            }
        }
    }
});
```

**Redis Connection URL Format:**

```
redis://[:password@]host[:port][/database]
redis://localhost:6379                    // Local Redis, default port
redis://:mypassword@localhost:6379/1      // With password, using database 1
redis://redis-server:6379                 // Remote Redis server
rediss://ssl-redis-server:6380            // SSL encrypted connection
redis://tls-redis-server:6380             // TLS enabled connection (with enableTls: true)
```

**Basic Usage:**

```javascript
let cache = FuseCore.cache;

// Set cache (asynchronous operation)
await cache.set('user:123', { name: 'John', age: 30 }, 3600); // Expires in 1 hour
await cache.set('session:abc', 'session-data', 0);           // Never expires

// Get cache
let user = await cache.get('user:123');
console.log(user); // { name: 'John', age: 30 }

// Important: Type preservation (JSON strings are not automatically parsed into objects)
await cache.set('json-string', '{"name":"John"}');  // Store JSON string
let jsonStr = await cache.get('json-string');       // Retrieved is still a string
console.log(typeof jsonStr);                        // "string"

// Delete cache
await cache.set('user:123', null); // Delete key

// Check if key exists (Redis-specific method)
let exists = await cache.exists('user:123');
console.log(exists); // false

// Set expiration time (Redis-specific method)
await cache.set('temp:data', 'some-value');
await cache.expire('temp:data', 600); // Expires in 10 minutes

// Get TTL (Redis-specific method)
let ttl = await cache.ttl('temp:data');
console.log(ttl); // Remaining seconds

// Get matching keys (Redis-specific method)
let keys = await cache.keys('user:*');
console.log(keys); // ['user:123', 'user:456', ...]

// Clear all cache (Redis-specific method)
await cache.flushAll();
```

**Error Handling:**

```javascript
try {
    await cache.set('mykey', 'myvalue');
    let value = await cache.get('mykey');
} catch (error) {
    console.error('Cache operation failed:', error);
}
```

**Close Connection:**

```javascript
// FuseCore will automatically close Redis connection when the application shuts down
await FuseCore.shutdown();
```

---

## 📄 License

**FuseCore** follows the [MIT License](LICENSE) open source license.

### MIT License

Copyright (c) 2024 Ds.3783

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.






