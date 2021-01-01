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

    if (typeof message === 'object') {
        point.fields = flatten(message);

        // Post-process special Keys in Objects
        if (('val' in point.fields) && !('value' in point.fields)) {
            point.fields.value = point.fields.val;
            delete point.fields.val;
        }

        if ('ts' in point.fields) {
            const ts = new Date(point.fields.ts);

            if ((receiveTimestamp - ts) <= (5 * 1000)) {
                point.tags.valid_timestamp = 'true';
                point.timestamp = ts;
                delete point.fields.ts;
            } else {
                point.tags.valid_timestamp = 'false';
            }
        }

        // Provide type casted versions
        Object.keys(point.fields).forEach(key => {
            // boolean -> number
            if (typeof point.fields[key] === 'boolean') {
                point.fields['__num__' + key] = point.fields[key] ? 1 : 0;
            }

            if (typeof point.fields[key] === 'string') {
                const value = point.fields[key];

                const numericValue = Number(value);
                if (!Number.isNaN(numericValue)) {
                    point.fields['__num__' + key] = numericValue;
                }

                if (/^\s*(true|on|enabled{0,1})\s*$/.test(value.toLowerCase())) {
                    point.fields['__bool__' + key] = true;
                    point.fields['__num__' + key] = 1;
                }

                if (/^\s*(false|off|disabled{0,1})\s*$/.test(value.toLowerCase())) {
                    point.fields['__bool__' + key] = false;
                    point.fields['__num__' + key] = 0;
                }
            }
        });

        delete point.fields.lc;
    } else {
        point.fields = {value: message};
    }

    // Write Datapoint
    influx.writePoints([point]).then(() => {
        log.debug('influx >', point.measurement);
    }).catch(error => {
        log.warn('influx >', point.measurement, error.message);
    });
});
