export default {
    extends: 'base',
    data: {
        type: 'beta',
        urlRoot: '',
        feRoot: '/web-fe',
        server: {
            source: '//d23r8i05s5zpof.cloudfront.net',
            base: 'https://api-staging.nestia.com/${version}',
            food: 'https://api-staging.nestia.com/${version}/food',
            review: 'https://api-staging.nestia.com/${version}/review',
            property: 'https://jsonplaceholder.typicode.com/posts',
            payment: 'https://api-staging.nestia.com/${version}/payment',
            buysell: 'https://api-staging.nestia.com/${version}/buysell',
            lottery: 'https://lottery-staging.nestia.com/api/${version}',
            promotion: 'https://api-staging.nestia.com/${version}',
            image: 'https://image-staging.nestia.com/api',
            luckydraw: 'https://luckydraw-staging.nestia.com/api/${version}',
            point: 'https://point-staging.nestia.com/api/${version}',
            branchio: 'https://httpbin.org/links/10',
            ad: 'https://httpbin.org/json',
            paiple: 'http://staging537.nestia.com',
            group: 'http://group-staging.nestia.com/api/${version}'
        },
        absoluteUrls: {
            group: 'https://group-staging.nestia.com',
            news: 'https://staging537.nestia.com/news'
        },
    }
};