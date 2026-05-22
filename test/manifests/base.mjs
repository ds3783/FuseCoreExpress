export default {
    data: {
        port: 3000,
        urlRoot: 'https://www.nestia.com',
        feRoot: 'https://da39lhlst827w.cloudfront.net',
        server: {
            property: 'https://property.nestia.com/api/${version}',
            news: 'https://news.nestia.com/api/${version}',
            lottery: 'https://httpbin.org/json',
        },
        serverDesc: 'FuseCore Web Server V1.0',
        refreshTokenTime: 3500, // unit s
        defaultVersion: {
            'base': 'v4.5',
            'review': 'v1.0',
            'luckydraw': 'v1.0',
            'news': 'v5.5'
        },
        absoluteUrls: {
            group: 'https://group.nestia.com',
            news: 'https://news.nestia.com'
        },
        isHot: false  //true: hot replacement and not load <link /> tag
    }
};