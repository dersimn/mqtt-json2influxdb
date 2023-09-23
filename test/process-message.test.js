/* eslint-env mocha */
/* eslint-disable prefer-arrow-callback, no-unused-vars */
/* eslint mocha/no-mocha-arrows: "error" */

const processMessage = require('../lib/process-message.js');

const chai = require('chai');
const should = chai.should();
const expect = chai.expect;
const assert = chai.assert;

describe('Chai Sanity Test', function () {
    describe('#indexOf()', function () {
        it('should1 return -1 when the value is not present', function () {
            should.equal([1, 2, 3].indexOf(4), -1);
        });
        it('should2 return -1 when the value is not present', function () {
            [1, 2, 3].indexOf(4).should.equal(-1);
        });
    });
});

describe('Process Message', function () {
    describe('Parse JSON values', function () {
        const tests = [
            // null
            {
                in: null,
                expected: {
                    '__type': 'json',
                    'payload__type': 'null'
                }
            },

            // number
            {
                in: 42,
                expected: {
                    '__type': 'json',
                    'payload__type': 'number',
                    'payload__number': 42
                }
            },
            {
                in: 3.1415,
                expected: {
                    '__type': 'json',
                    'payload__type': 'number',
                    'payload__number': 3.1415
                }
            },

            // string
            {
                in: 'foo',
                expected: {
                    '__type': 'json',
                    'payload__type': 'string',
                    'payload__string': 'foo'
                }
            },

            // object
            {
                in: {
                    foo: 'bar'
                },
                expected: {
                    '__type': 'json',
                    'payload__type': 'object',
                    'payload.foo__type': 'string',
                    'payload.foo__string': 'bar'
                }
            },
            {
                in: {
                    mynull: null
                },
                expected: {
                    '__type': 'json',
                    'payload__type': 'object',
                    'payload.mynull__type': 'null'
                }
            },
            {
                in: {
                    foo: {
                        bar: 'baz'
                    }
                },
                expected: {
                    '__type': 'json',
                    'payload__type': 'object',
                    'payload.foo.bar__type': 'string',
                    'payload.foo.bar__string': 'baz'
                }
            },

            // array
            {
                in: [
                    1,
                    2,
                    3
                ],
                expected: {
                    '__type': 'json',
                    'payload__type': 'array',
                    'payload.0__type': 'number',
                    'payload.1__type': 'number',
                    'payload.2__type': 'number',
                    'payload.0__number': 1,
                    'payload.1__number': 2,
                    'payload.2__number': 3,
                }
            },
            {
                in: [
                    1,
                    null
                ],
                expected: {
                    '__type': 'json',
                    'payload__type': 'array',
                    'payload.0__type': 'number',
                    'payload.1__type': 'null',
                    'payload.0__number': 1,
                }
            },
            {
                in: [
                    1,
                    [
                        2,
                        3
                    ]
                ],
                expected: {
                    '__type': 'json',
                    'payload__type': 'array',
                    'payload.0__type': 'number',
                    'payload.1.0__type': 'number',
                    'payload.1.1__type': 'number',
                    'payload.0__number': 1,
                    'payload.1.0__number': 2,
                    'payload.1.1__number': 3,
                }
            },
        ];

        tests.forEach(function (test) {
            it(`parses ${JSON.stringify(test.in)} → ${JSON.stringify(test.expected)}`, function () {
                const point = processMessage('topic', {
                    payload: Buffer.from(JSON.stringify(test.in)),
                }, 123);

                expect(point.fields).to.deep.equal(test.expected);
            });
        });
    });
});
