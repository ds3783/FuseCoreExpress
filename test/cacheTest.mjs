import assert from 'assert';
import FuseCore from "../dist/esm/index.mjs";

describe('FuseCore', function () {
    describe('cache', function () {
        let random = '' + Math.random();
        describe('#set()', function () {
            it('worker should not exit', async function () {
                await FuseCore.cache.set('RANDOM', random);
                let value = await FuseCore.cache.get('RANDOM');
                assert.strictEqual(value, random);
            });
        });


        describe('#get()', function () {
            it('worker should exit by it self', async function () {
                let value = await FuseCore.cache.get('RANDOM');
                assert.strictEqual(value, random);
            });
        });

        describe('#setWithTimeout', function () {
            it('worker should exit by it self', async function () {
                this.timeout(3000);
                await FuseCore.cache.set('RANDOM2', random, 1);
                let value = await FuseCore.cache.get('RANDOM2');
                assert.strictEqual(value, random);
                
                // Wait for expiration
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                //this is a trick force cache check expired key-value pair
                FuseCore.cache.init();
                let expiredValue = await FuseCore.cache.get('RANDOM2');
                assert.strictEqual(expiredValue, null);
            });
        });


    });
});



