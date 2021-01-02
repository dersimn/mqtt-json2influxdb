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
const processMessage = require('./lib/process-message.js');

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
    const point = processMessage(topic, message, packet, receiveTimestamp);

    // Write Datapoint
    influx.writePoints([point]).then(() => {
        log.debug('influx >', point.measurement);
    }).catch(error => {
        log.warn('influx >', point.measurement, error.message);
    });
});
