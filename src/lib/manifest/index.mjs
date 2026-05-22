import fs
    from 'fs';
import path
    from 'path';
import {
    createRequire
} from 'module';

const require = createRequire(import.meta.url)

import DeepClone
    from "../deepClone.mjs";


let manifest,
    logger = null;

let init = async function (moduleInstances, opts) {
    logger = moduleInstances['log'].getLogger();
    let options = opts['manifest'] || {};
    if (options['path'] && !path.isAbsolute(options['path'])) {
        options['path'] = path.join(process.cwd(), options['path']);
    }
    let rootDir = options['path'] || '',
        manifestName = options['name'];
    if (!rootDir || !fs.existsSync(rootDir)) {
        return manifest = {};
    }
    let files = fs.readdirSync(rootDir);
    let configs = {};
    for (let file of files) {
        let name = file.replace(/\.m?js$/, '');
        let filePath = path.join(rootDir, file);
        let m;
        if (!/\.m?js$/i.test(file)) {
            logger.warn('Unsupported manifest file type[IGNORED]:' + filePath);
            continue;
        }
        try {
            logger.debug('Mounting manifest file:' + filePath);
            m = require(filePath);
        } catch (e) {
            try {
                m = await import(filePath);
            } catch (e) {
                logger.error('Error parsing manifest file:' + filePath, e);
                throw new Error('Error parsing manifest file:' + filePath);
            }
        }
        if (m.__esModule) {
            m = m.default;
        } else if (m && Symbol.toStringTag && m[Symbol.toStringTag] === 'Module') {
            // Error: Detected ESM module loaded via require() in ESM environment
            // This occurs when trying to use require() to load an ESM file in a module context
            // (e.g., when package.json has type=module or file has .mjs extension)
            logger.error('Error: Attempted to load ESM module using require() in ESM environment. File: ' + filePath);
            logger.error('This may occur when:');
            logger.error('  1. Using require() to load an ESM file (.mjs or type=module)');
            logger.error('  2. The manifest file is an ESM module but loaded via CJS require()');
            throw new Error('Cannot load ESM module using require() in ESM environment: ' + filePath);
        }
        if (m) {
            configs[name] = m;
        }
    }

    if (!configs[manifestName]) {
        throw new Error('Manifest config not found: ' + manifestName);
    }
    let needle = configs[manifestName];
    let stash = [];
    while (needle) {
        if (needle.data) {
            stash.unshift(needle.data);
        }
        needle = configs[needle.extends];
    }
    manifest = {};
    for (let config of stash) {
        DeepClone(manifest, config);
    }
    return manifest;
};

export default {
    init,
    get: function (key, ignoreNonExistsKey) {
        if (typeof key !== 'string' || !key) {
            if (ignoreNonExistsKey) {
                return null;
            } else {
                throw new Error('Invalid manifest key: ' + key);
            }
        }
        let keys = key.split('.');
        let result = manifest;
        for (let k of keys) {
            if (!result.hasOwnProperty(k)) {
                if (ignoreNonExistsKey) {
                    return null;
                } else {
                    throw new Error('Invalid manifest key: ' + key);
                }
            }
            result = result[k];
        }
        return result;
    },
    getBackendUrl: function (server, path, version) {
        let defaultVersion = this.get('defaultVersion.' + server, true);
        let defaultBaseVersion = this.get('defaultVersion.base', true);
        let serverUrl = this.get('server.' + server);
        let v = version || defaultVersion || defaultBaseVersion;
        return serverUrl.replace('${version}', v) + (path || '');
    }
};
