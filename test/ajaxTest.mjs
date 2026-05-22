import assert from 'assert';
import stream from 'stream';
import FuseCore from "../dist/esm/index.mjs";


describe('FuseCore', function () {
    describe('Ajax', function () {
        describe('#request()', function () {


            it('property/api/v4.5/hotwords', function (done) {
                this.timeout(5000);
                FuseCore.ajax.request({
                    server: 'property',
                    path: '/hotwords',
                    headers: {'User-Agent': 'Test'},
                    contentType: 'json'
                }).then(function (data) {
                    assert.strictEqual(data.status, 200, 'Server should response 200 OK');
                    assert.strictEqual(typeof data.data, 'object', 'should get a object response');
                    assert.strictEqual(data.data.hasOwnProperty('rental_hot_words'), true, 'result should has rental_hot_words property');
                    done();
                }, function (err) {
                    setTimeout(function () {
                        done(err);
                    }, 50);
                })

            });
            it('news/api/vx.x/news', function (done) {
                this.timeout(5000);
                FuseCore.ajax.request({
                    server: 'news',
                    path: '/news',
                    data: {
                        type: 7, limit: 2, request_from: 'r_lottery_app_reads'
                    },
                    headers: {'User-Agent': 'Test'},
                    contentType: 'json',
                    timeout: 3000
                }).then(function (data) {
                    assert.strictEqual(data.status, 200, 'Server should response 200 OK');
                    assert.strictEqual(typeof data.data, 'object', 'should get a object response');
                    assert.strictEqual(Array.isArray(data.data), true, 'result should be an array');
                    done();
                }, function (err) {
                    setTimeout(function () {
                        done(err);
                    }, 50);
                });

            });

            it('myip', function (done) {
                this.timeout(5000);
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                // let proxyOuterIP = '159.138.98.103';
                let proxy = 'http://127.0.0.1:7666';
                FuseCore.ajax.request({
                    url: 'https://api.myip.com',
                    data: {},
                    headers: {'User-Agent': 'Test'},
                    resContentType: 'json',
                    timeout: 3000,
                    proxy: proxy
                }).then(function (data) {
                    assert.strictEqual(data.status, 200, 'Server should response 200 OK');
                    assert.strictEqual(typeof data.data, 'object', 'should get a string response');
                    // assert.strictEqual(data.data.ip, proxyOuterIP, `result should be proxy ip, expect:${proxyOuterIP} actual:${data.data.ip}`);
                    done();
                }, function (err) {
                    setTimeout(function () {
                        done(err);
                    }, 50);
                });

            });
            it('myip-stream-to-console', function (done) {
                this.timeout(5000);
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                // let proxyOuterIP = '159.138.98.103';
                let proxy = 'http://127.0.0.1:7666';
                FuseCore.ajax.request({
                    url: 'https://api.myip.com',
                    data: {},
                    headers: {'User-Agent': 'Test'},
                    resContentType: 'stream',
                    timeout: 3000,
                    proxy: proxy
                }).then(function (data) {
                    assert.strictEqual(data.status, 200, 'Server should response 200 OK');
                    assert.strictEqual(typeof data.raw, 'object', 'should get a string response');
                    assert.ok(data.raw instanceof stream.Readable, 'raw should be readable');
                    data.raw.pipe(process.stdout);
                    done();
                }, function (err) {
                    setTimeout(function () {
                        done(err);
                    }, 50);
                });

            });

            it('gzip-stream', function (done) {
                this.timeout(5000);
                FuseCore.ajax.request({
                    url: 'https://www.nestia.com/',
                    data: {},
                    headers: {
                        'User-Agent': 'Test',
                        'Accept-Encoding': 'gzip',
                    },
                    resContentType: 'stream',
                    timeout: 3000,
                }).then(function (data) {
                    assert.strictEqual(data.status, 200, 'Server should response 200 OK');
                    assert.strictEqual(typeof data.raw, 'object', 'should get a string response');
                    assert.ok(data.raw instanceof stream.Readable, 'raw should be readable');
                    let content = [];
                    data.raw.on('data', function (data) {
                        content.push(data);
                    })
                    data.raw.on('end', function () {
                        let finalContent = content.join('');
                        assert.ok(/<meta charset="UTF-8">/.test(finalContent), 'Content should be gzip decoded.');
                        done();
                    })
                }, function (err) {
                    setTimeout(function () {
                        done(err);
                    }, 50);
                });

            });
            it('very-old-tls-server ', function (done) {
                this.timeout(30000);
                FuseCore.ajax.request({
                    url: 'https://app.cifm.com',
                    method: 'GET',
                    data: {},
                    headers: {
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                        "accept-language": "en,zh-CN;q=0.9,zh;q=0.8",
                        "cache-control": "no-cache",
                        "pragma": "no-cache",
                        "sec-fetch-dest": "document",
                        "sec-fetch-mode": "navigate",
                        "sec-fetch-site": "none",
                        "sec-fetch-user": "?1",
                        "upgrade-insecure-requests": "1",
                        'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
                        'Accept-Encoding': 'gzip, deflate',
                    },
                    resContentType: 'stream',
                    timeout: 20000,
                }).then(function (data) {
                    assert.strictEqual(data.status, 200, 'Server should response 200 OK');
                    assert.strictEqual(typeof data.raw, 'object', 'should get a string response');
                    assert.ok(data.raw instanceof stream.Readable, 'raw should be readable');
                    done();
                }).catch(function (err) {
                    setTimeout(function () {
                        done(err);
                    }, 16);
                    assert.fail(err.message || err);
                });

            });
        });
    });
});