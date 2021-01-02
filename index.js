#!/usr/bin/env node

const pkg = require('./package.json');
const log = require('yalm');
const config = require('yargs')
    .env('MQTT2INFLUX')
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('verbosity', 'possible values: "error", "warn", "info", "debug"')
    .describe('mqtt-url', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('influx-host')
    .describe('influx-port')
    .describe('influx-database')
    .describe('subscription', 'array of topics to subscribe').array('subscription')
    .alias({
        h: 'help',
        m: 'mqtt-url',
        v: 'verbosity'
    })
    .default({
        'mqtt-url': 'mqtt://127.0.0.1',
        'influx-host': '127.0.0.1',
        'influx-port': 8086,
        'influx-database': 'mqtt',
        subscription: [
            '#'
        ]
    })
    .version()
    .help('help')
    .argv;
const MqttSmarthome = require('mqtt-smarthome-connect');
const Influx = require('influx');
const flatten = require('flat');

log.setLevel(config.verbosity);
log.info(pkg.name + ' ' + pkg.version + ' starting');
log.debug('loaded config: ', config);

const influx = new Influx.InfluxDB({
    host: config.influxHost,
    port: config.influxPort,
    database: config.influxDatabase
});

log.info('mqtt trying to connect', config.mqttUrl);
const mqtt = new MqttSmarthome(config.mqttUrl, {
    logger: log
});
mqtt.connect();

mqtt.on('connect', () => {
    log.info('mqtt connected', config.mqttUrl);
});

mqtt.subscribe(config.subscription, (topic, message, wildcard, packet) => {
    const receiveTimestamp = new Date();

    if (packet.retain) {
        // Skip retained messages on start
        return;
    }

    // Build InfluxDB Datapoint
    const point = {};
    point.measurement = Influx.escape.measurement(topic);
    point.tags = {};
    point.timestamp = receiveTimestamp;

    if (typeof message === 'object' && message !== null) {
        const flatMessage = flatten(message);
        let fieldSet = {};

        // Process special keys
        if ('ts' in flatMessage) {
            const ts = new Date(flatMessage.ts);

            if ((receiveTimestamp - ts) <= (5 * 1000)) {
                point.tags.valid_timestamp = 'true';
                point.timestamp = ts;
                delete flatMessage.ts;
            } else {
                point.tags.valid_timestamp = 'false';
            }
        }

        delete flatMessage.lc;

        // Provide type casted versions
        Object.keys(flatMessage).forEach(key => {
            fieldSet = {
                ...fieldSet,
                ...processKeyValue(flatMessage[key], key)
            };
        });

        point.fields = fieldSet;
        point.fields.__payload__type = Array.isArray(message) ? 'array' : 'object';
    } else if (packet.payload.length === 0) {
        point.fields = processKeyValue(null, 'val');
        point.fields.__payload__type = 'empty';
    } else if (message === null) {
        point.fields = processKeyValue(null, 'val');
        point.fields.__payload__type = 'null';
    } else {
        point.fields = processKeyValue(message, 'val');
        point.fields.__payload__type = typeof message;
    }

    // Write Datapoint
    influx.writePoints([point]).then(() => {
        log.debug('influx >', point.measurement);
    }).catch(error => {
        log.warn('influx >', point.measurement, error.message);
    });
});

function processKeyValue(value, key = 'value') {
    const tmp = {};

    if (typeof value === 'boolean') {
        tmp[key + '__type'] = 'boolean';
        tmp[key + '__bool'] = value;
        tmp[key + '__num'] = value ? 1 : 0;
    } else if (typeof value === 'string') {
        tmp[key + '__type'] = 'string';
        tmp[key + '__str'] = value;

        if (/^\s*(true|on(line)?|enabled?|ok|yes)\s*$/.test(value.toLowerCase())) {
            tmp[key + '__bool'] = true;
            tmp[key + '__num'] = 1;
        }

        if (/^\s*(false|off(line)?|disabled?|fail|no)\s*$/.test(value.toLowerCase())) {
            tmp[key + '__bool'] = false;
            tmp[key + '__num'] = 0;
        }

        const numericValue = Number.parseFloat(value);
        if (!Number.isNaN(numericValue)) {
            tmp[key + '__num'] = numericValue;
        }
    } else if (typeof value === 'number') {
        tmp[key + '__type'] = 'number';
        tmp[key + '__num'] = value;
    } else if (value === null) {
        tmp[key + '__type'] = 'null';
    }

    return tmp;
}
