'use strict';

var expect   = require('expect.js');
var promptly = require('../index');
var async    = require('async');

var stdout = '';
var oldWrite = process.stdout.write;
process.stdout.write = function (data) {
    stdout += data;
    return oldWrite.apply(process.stdout, arguments);
};

describe('prompt()', function () {
    it('should prompt the user', function (next) {
        stdout = '';

        promptly.prompt('something: ', function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('yeaa');
            expect(stdout).to.contain('something: ');
            next();
        });

        process.stdin.emit('data', 'yeaa\n');
    });

    it('should keep asking if no value is passed and not default was defined', function (next) {
        stdout = '';

        promptly.prompt('something: ', function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('yeaa');
            expect(stdout).to.contain('something: ');
            expect(stdout.indexOf('something')).to.not.be(stdout.lastIndexOf('something'));
            next();
        });

        process.stdin.emit('data', '\n');
        process.stdin.emit('data', 'yeaa\n');
    });

    it('should assume default value if nothing is passed', function (next) {
        stdout = '';

        promptly.prompt('something: ', { 'default': 'yeaa' }, function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('yeaa');
            expect(stdout).to.contain('something: ');
            next();
        });

        process.stdin.emit('data', '\n');
    });

    it('should trim the user input if trim is enabled', function (next) {
        stdout = '';

        promptly.prompt('something: ', { trim: true }, function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('yeaa');
            expect(stdout).to.contain('something: ');
            next();
        });

        process.stdin.emit('data', ' yeaa \n');
    });

    it('should call validator after trimming', function (next) {
        stdout = '';

        var validator = function (value) {
            if (value !== 'yeaa') {
                throw new Error('bla');
            }

            return value;
        };

        promptly.prompt('something: ', { validator: validator }, function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('yeaa');
            expect(stdout).to.contain('something: ');
            next();
        });

        process.stdin.emit('data', ' yeaa \n');
    });

    it('should give error if the validator fails', function (next) {
        stdout = '';

        var validator = function () { throw new Error('bla'); };

        promptly.prompt('something: ', { validator: validator }, function (err) {
            expect(err).to.be.an(Error);
            expect(err.message).to.be('bla');
            expect(stdout).to.contain('something: ');
            next();
        });

        process.stdin.emit('data', ' yeaa \n');
    });

    it('should assume values from the validator', function (next) {
        stdout = '';

        var validator = function () { return 'bla'; };

        promptly.prompt('something: ', { validator: validator }, function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('bla');
            expect(stdout).to.contain('something: ');
            next();
        });

        process.stdin.emit('data', ' yeaa \n');
    });

    it('should give retry ability on error', function (next) {
        stdout = '';

        var validator = function (value) {
            if (value !== 'yeaa') {
                throw new Error('bla');
            }

            return value;
        },
            times = 0;

        promptly.prompt('something: ', { trim: true, validator: validator }, function (err, value) {
            times++;

            if (times === 1) {
                expect(err).to.be.an(Error);
                err.retry();
                return process.stdin.emit('data', 'yeaa\n');
            }

            expect(value).to.equal('yeaa');
            next();
        });

        process.stdin.emit('data', 'wtf\n');
    });
});

describe('choose()', function () {
    it('should keep asking on invalid choice', function (next) {
        stdout = '';

        promptly.choose('apple or orange: ', ['apple', 'orange'], function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('orange');
            expect(stdout).to.contain('apple or orange: ');
            expect(stdout.indexOf('apple or orange')).to.not.be(stdout.lastIndexOf('apple or orange'));
            next();
        });

        process.stdin.emit('data', 'bleh\n');
        process.stdin.emit('data', 'orange\n');
    });

    it('should error on invalid choice if retry is disabled', function (next) {
        stdout = '';

        promptly.choose('apple or orange: ', ['apple', 'orange'], { retry: false }, function (err) {
            expect(err).to.be.an(Error);
            expect(err.message).to.contain('choice');
            expect(stdout).to.contain('apple or orange: ');
            next();
        });

        process.stdin.emit('data', 'bleh\n');
    });

    it('should be ok on valid choice', function (next) {
        stdout = '';

        promptly.choose('apple or orange: ', ['apple', 'orange'], function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be('apple');
            expect(stdout).to.contain('apple or orange: ');
            next();
        });

        process.stdin.emit('data', 'apple\n');
    });
});

describe('confirm()', function () {
    it('should be ok on valid choice and coerce to boolean values', function (next) {
        stdout = '';

        async.forEachSeries(['yes', 'Y', 'y', '1'], function (truthy, next) {
            promptly.confirm('test yes: ', { retry: false }, function (err, value) {
                expect(err).to.be(null);
                expect(value).to.be(true);
                expect(stdout).to.contain('test yes: ');
                next();
            });

            process.stdin.emit('data', truthy + '\n');
        }, function () {
            async.forEachSeries(['no', 'N', 'n', '0'], function (truthy, next) {
                promptly.confirm('test no: ', function (err, value) {
                    expect(err).to.be(null);
                    expect(value).to.be(false);
                    expect(stdout).to.contain('test no: ');
                    next();
                });

                process.stdin.emit('data', truthy + '\n');
            }, next);
        });
    });

    it('should keep asking on invalid choice', function (next) {
        stdout = '';

        promptly.confirm('yes or no: ', function (err, value) {
            expect(err).to.be(null);
            expect(value).to.be(true);
            expect(stdout).to.contain('yes or no: ');
            expect(stdout.indexOf('yes or no')).to.not.be(stdout.lastIndexOf('yes or no'));
            next();
        });

        process.stdin.emit('data', 'bleh\n');
        process.stdin.emit('data', 'y\n');
    });

    it('should error on invalid choice if retry is disabled', function (next) {
        stdout = '';

        promptly.confirm('yes or no: ', { retry: false }, function (err) {
            expect(err).to.be.an(Error);
            expect(err.message).to.contain('choice');
            expect(stdout).to.contain('yes or no: ');
            next();
        });

        process.stdin.emit('data', 'bleh\n');
    });
});