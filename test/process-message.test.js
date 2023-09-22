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
    describe('Parse primitive Values', function () {
        const tests = [
            {in: null, expected: {__type: 'null'}}
        ];

        tests.forEach(function (test) {
            it(`parses ${test.in} → ${JSON.stringify(test.expected)}`, function () {
                const point = processMessage('topic', test.in, {payload: 'something'}, 123);
                expect(point.fields).to.deep.equal(test.expected);
            });
        });
    });
});
