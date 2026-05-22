import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;

export default {
    init: async function (options = {}) {
        // Redis 连接配置
        const redisConfig = {
            url: options.url || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 50, 500),
                tls: options.enableTls || false,
            },
            ...options.clientOptions
        };

        try {
            // 创建Redis客户端
            redisClient = createClient(redisConfig);

            // 监听连接事件
            redisClient.on('connect', () => {
                console.log('Redis client connecting...');
            });

            redisClient.on('ready', () => {
                console.log('Redis client ready');
                isConnected = true;
            });

            redisClient.on('error', (err) => {
                console.error('Redis client error:', err);
                isConnected = false;
            });

            redisClient.on('end', () => {
                console.log('Redis client disconnected');
                isConnected = false;
            });

            // 连接到Redis
            await redisClient.connect();
            
            return this;
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    },

    close: async function () {
        if (redisClient && isConnected) {
            try {
                await redisClient.quit();
                console.log('Redis connection closed');
            } catch (error) {
                console.error('Error closing Redis connection:', error);
                // 强制断开连接
                await redisClient.disconnect();
            }
        }
        redisClient = null;
        isConnected = false;
    },

    get: async function (key) {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            const value = await redisClient.get(key);
            if (value === null) {
                return null;
            }
            
            // 检查值是否有我们的类型标记前缀
            if (value.startsWith('__FUSE_STR__:')) {
                // 原始字符串值，去掉前缀返回
                return value.substring(13);
            } else if (value.startsWith('__FUSE_OBJ__:')) {
                // 序列化对象，去掉前缀后解析JSON
                return JSON.parse(value.substring(13));
            } else {
                // 兼容旧版本数据：尝试解析JSON，失败则返回原始字符串
                try {
                    return JSON.parse(value);
                } catch (parseError) {
                    return value;
                }
            }
        } catch (error) {
            console.error('Redis GET error:', error);
            throw error;
        }
    },

    set: async function (key, val, timeout = 300) {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            // 获取旧值
            const oldVal = await this.get(key);

            // 序列化值并添加类型标记前缀
            let serializedValue;
            if (typeof val === 'string') {
                // 字符串类型，添加字符串标记前缀
                serializedValue = '__FUSE_STR__:' + val;
            } else {
                // 非字符串类型，JSON序列化后添加对象标记前缀
                serializedValue = '__FUSE_OBJ__:' + JSON.stringify(val);
            }

            // 设置值，如果timeout > 0则设置过期时间
            if (timeout > 0) {
                await redisClient.setEx(key, timeout, serializedValue);
            } else {
                // timeout <= 0 表示永不过期
                await redisClient.set(key, serializedValue);
            }

            return oldVal;
        } catch (error) {
            console.error('Redis SET error:', error);
            throw error;
        }
    },

    del: async function (key) {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            // 获取要删除的值
            const val = await this.get(key);
            
            // 删除键
            await redisClient.del(key);
            
            return val;
        } catch (error) {
            console.error('Redis DEL error:', error);
            throw error;
        }
    },

    // 额外的Redis特有方法
    exists: async function (key) {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Redis EXISTS error:', error);
            throw error;
        }
    },

    expire: async function (key, seconds) {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            const result = await redisClient.expire(key, seconds);
            return result === 1;
        } catch (error) {
            console.error('Redis EXPIRE error:', error);
            throw error;
        }
    },

    ttl: async function (key) {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            return await redisClient.ttl(key);
        } catch (error) {
            console.error('Redis TTL error:', error);
            throw error;
        }
    },

    keys: async function (pattern = '*') {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            return await redisClient.keys(pattern);
        } catch (error) {
            console.error('Redis KEYS error:', error);
            throw error;
        }
    },

    flushAll: async function () {
        if (!redisClient || !isConnected) {
            throw new Error('Redis client is not connected');
        }

        try {
            await redisClient.flushAll();
        } catch (error) {
            console.error('Redis FLUSHALL error:', error);
            throw error;
        }
    }
};