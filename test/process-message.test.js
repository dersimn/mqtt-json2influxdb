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
    describe('Parse simple values', function () {
        const tests = [
            // null
            {
                in: 'null',
                expected: {
                    'payload__type': 'null'
                }
            },

            // boolean
            {
                in: 'true',
                expected: {
                    'payload__type': 'boolean',
                    'payload__boolean': true,
                    'payload__number': 1
                }
            },
            {
                in: 'false',
                expected: {
                    'payload__type': 'boolean',
                    'payload__boolean': false,
                    'payload__number': 0
                }
            },

            // number
            {
                in: '42',
                expected: {
                    'payload__type': 'number',
                    'payload__number': 42
                }
            },
            {
                in: '3.1415',
                expected: {
                    'payload__type': 'number',
                    'payload__number': 3.1415
                }
            },

            // string
            {
                in: '"foo"',
                expected: {
                    'payload__type': 'string',
                    'payload__string': 'foo'
                }
            },
            {
                in: 'foo',
                expected: {
                    'payload__type': 'raw-string',
                    'payload__string': 'foo'
                }
            },
            {
                in: '',
                expected: {
                    'payload__type': 'empty',
                }
            },
            {
                in: 'enabled',
                expected: {
                    'payload__type': 'raw-string',
                    'payload__string': 'enabled',
                    'payload__boolean': true,
                    'payload__number': 1
                }
            },

            // number in string
            {
                in: '"42"',
                expected: {
                    'payload__type': 'string',
                    'payload__string': '42',
                    'payload__number': 42
                }
            },
            {
                in: '"3.1415"',
                expected: {
                    'payload__type': 'string',
                    'payload__string': '3.1415',
                    'payload__number': 3.1415
                }
            },

            // boolean in string
            {
                in: '"true"',
                expected: {
                    'payload__type': 'string',
                    'payload__string': 'true',
                    'payload__boolean': true,
                    'payload__number': 1
                }
            },
            {
                in: '"false"',
                expected: {
                    'payload__type': 'string',
                    'payload__string': 'false',
                    'payload__boolean': false,
                    'payload__number': 0
                }
            },
        ];

        tests.forEach(function (test) {
            it(`parses ${String(test.in)} → ${JSON.stringify(test.expected)}`, function () {
                const point = processMessage('topic', {
                    payload: Buffer.from(String(test.in)),
                }, 123);

                expect(point.fields).to.deep.equal(test.expected);
            });
        });
    });

    describe('Parse objects/arrays', function () {
        const tests = [
            // object
            {
                in: {},
                expected: {
                    'payload__type': 'object',
                }
            },
            {
                in: {
                    foo: 'bar'
                },
                expected: {
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
                    'payload__type': 'object',
                    'payload.foo.bar__type': 'string',
                    'payload.foo.bar__string': 'baz'
                }
            },

            // array
            {
                in: [],
                expected: {
                    'payload__type': 'array',
                }
            },
            {
                in: [
                    1,
                    2,
                    3
                ],
                expected: {
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
                    ],
                    {
                        foo: 'bar'
                    }
                ],
                expected: {
                    'payload__type': 'array',
                    'payload.0__type': 'number',
                    'payload.1.0__type': 'number',
                    'payload.1.1__type': 'number',
                    'payload.2.foo__type': 'string',
                    'payload.0__number': 1,
                    'payload.1.0__number': 2,
                    'payload.1.1__number': 3,
                    'payload.2.foo__string': 'bar',
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
