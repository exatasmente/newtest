const assert = require('assert');
const { Store } = require('../lib/autokin');
const sinon = require('sinon');

describe('Autokin Store', function () {

    it('should be able to set storage', function () {
        Store.set('key', 'value');
        assert.strictEqual(Store.resolve('key'), 'value');
    });

    it('should be able to merge json object', function () {
        Store.merge({ key1: 'value1' });
        assert.strictEqual(Store.resolve('key'), 'value');
        assert.strictEqual(Store.resolve('key1'), 'value1');
    });

    it('should be able to sanitize string with value from store', function () {
        let pickle = Store.sanitize('Hello {key}');
        assert.strictEqual(pickle, 'Hello value');
    });

    it('should be able to sanitize string with multiple variable value from store', function () {
        let pickle = Store.sanitize('Hello {key} {key1}');
        assert.strictEqual(pickle, 'Hello value value1');
    });

    it('should be able to sanitize string with mixed unknown and known variable value from store', function () {
        let pickle = Store.sanitize('Hello {key} {key2}');
        assert.strictEqual(pickle, 'Hello value {key2}');
    });

    it('should be able to sanitize JSON object', function () {
        let source = {
            name: 'Hello {key}',
            data: {
                inner: 'There {key1}'
            },
            number: 0
        };
        let pickle = Store.sanitizeJson(source);
        assert.strictEqual(pickle.name, 'Hello value');
        assert.strictEqual(pickle.data.inner, 'There value1');
    });
   
    it('should be able to store email generator to cache', function () {
        let pickle = Store.sanitize('Hello {generate:email(hello.com)}');
        let cachedPickle = Store.sanitize('Hello {generate:email(hello.com)}', true);
        assert.strictEqual(pickle, cachedPickle);
    });

    xit('should be able to store name generator to cache', function () {
        let pickle = Store.sanitize('Hello {generate:firstname(male)} {generate:firstname} {generate:lastname}');
        let cachedPickle = Store.sanitize('Hello {generate:firstname(male)} {generate:firstname} {generate:lastname}', true);
        assert.strictEqual(pickle, cachedPickle);
    });

    xit('should be able to store any generator to cache', function () {
        let pickle = Store.sanitize('Hello {generate:any(5)} {generate:any}');
        let cachedPickle = Store.sanitize('Hello {generate:any(5)} {generate:any}', true);
        assert.strictEqual(pickle, cachedPickle);
    });

    it('should be able to handle even if generator is unknown', function () {
        let pickle = Store.sanitize('Hello {generate:special}');
        let cachedPickle = Store.sanitize('Hello {generate:special}', true);
        assert.strictEqual(pickle, cachedPickle);
    });

    it('should be able to handle even if no keyword specified along with generator', function () {
        let pickle = Store.sanitize('Hello {generate:}');
        let cachedPickle = Store.sanitize('Hello {generate:}', true);
        assert.strictEqual(pickle, cachedPickle);
    });

    it('should be able to perform variable mapping not from cache', function () {
        let pickle = Store.interpolateValues('Hello {key}', Store.storage);
        assert.strictEqual(pickle, 'Hello value');
    });

    it('should be able to perform generate not from cache', function () {
        let pickle = Store.interpolateValues('Hello {generate:unknown}', Store.storage);
        assert.strictEqual(pickle, 'Hello {generate:unknown}');
    });

    it('should be able to perform generator not from cache', function () {
        let errorSpy = sinon.spy(Store, 'generator');
        try {
            Store.generator(['unknown']);        
        } catch(error) {
            assert.strictEqual(errorSpy.threw(), true);
        }
    });

    it('should be able to perform any generation with arguments', function () {
        let randomStub = sinon.stub(Math, 'random');
        randomStub.returns(0.00001);
        let pickle = Store.interpolateValues('Hello {generate:any(3,numbers)}', Store.storage);
        assert.strictEqual(pickle, 'Hello 111');
        randomStub.restore();
    });

    it('should be able to perform any generation with multiple arguments', function () {
        let randomStub = sinon.stub(Math, 'random');
        randomStub.returns(0.00001);
        let pickle = Store.interpolateValues('Hello {generate:any(3,numbers,lowercase)}', Store.storage);
        assert.strictEqual(pickle, 'Hello aaa');
        randomStub.restore();
    });

    it('should be able to perform UUID generation', function () {
        let randomStub = sinon.stub(Math, 'random');
        randomStub.returns(0.001);
        let pickle = Store.interpolateValues('Hello {generate:uuid}', Store.storage);
        assert.strictEqual(pickle, 'Hello 10000000-1000-4000-8000-100000000000');

        let uuid = Store.generate('generate:uuid');
        assert.strictEqual(uuid, '10000000-1000-4000-8000-100000000000');

        randomStub.restore();
    });

    it('should be able to perform 2 level interpolation', function () {
        Store.set('number_key', 'numbers');
        let randomStub = sinon.stub(Math, 'random');
        randomStub.returns(0.00001);

        process.env.NUMBER_KEY = 3;

        let pickle = Store.interpolateValues(
            'Hello {generate:any(<env:NUMBER_KEY>,number,lowercase)}',
            Store.storage
        );
        assert.strictEqual(pickle, 'Hello aaa');
        randomStub.restore();
    });

    it('should be able to parse URL', function () {
        Store.set('URLPath', 'https://www.autokinjs.com/hello?pathid=32422');

        let epath = Store.interpolateValues('Hello {parse:path(URLPath)}', Store.storage);
        assert.strictEqual(epath, 'Hello /hello?pathid=32422');

        let eparam = Store.interpolateValues('Hello {parse:params(pathid,URLPath)}', Store.storage);
        assert.strictEqual(eparam, 'Hello 32422');

        let eunknwn = Store.interpolateValues('Hello {parse:unknown}', Store.storage);
        assert.strictEqual(eunknwn, 'Hello {parse:unknown}');

        Store.cacheStore = [];
        let ehostname = Store.interpolateValues('Hello {parse:hostname(URLPath)}', Store.storage);
        assert.strictEqual(ehostname, 'Hello www.autokinjs.com');

        let ecache = Store.interpolateValues('Hello {parse:hostname(URLPath)}', Store.storage, true);
        assert.strictEqual(ecache, 'Hello www.autokinjs.com');

        let parserValue = Store.parse('parse:hostname(URLPath)');
        assert.strictEqual(parserValue, 'www.autokinjs.com');
    });
});