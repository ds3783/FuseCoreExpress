import assert from 'assert';
import FuseCore from "../dist/esm/index.mjs";


describe('FuseCore', function () {
    describe('manifest', function () {
        describe('#init()', function () {

            it('should return something', function () {
                assert.strictEqual(FuseCore.manifest.get('type'), 'production', 'type should be "production"');
            });
        });
    });
});