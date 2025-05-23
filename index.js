#!/usr/bin/env node

const pkg = require('./package.json'); // eslint-disable-line import/order
const process = require('node:process');
const log = require('yalm');
const config = require('yargs')
    .env(pkg.name.replace(/[^a-zA-Z\d]/, '').toUpperCase())
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('mqtt-prefix', 'prefix for every MQTT message that this tool publishes (currently only one online/offline message for debugging')
    .describe('verbosity', 'possible values: "error", "warn", "info", "debug"')
    .describe('mqtt-url', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('influxdb-url', 'url to InfluxDB, e.g.: http://user:password@host:8086/database')
    .describe('subscription', 'array of topics to subscribe').array('subscription')
    .describe('chunk-size', 'maximum number of points to buffer before writing to InfluxDB')
    .describe('max-interval', 'maximum time to wait if chunk size is not completely filled before writing to InfluxDB anyway')
    .describe('static-tag', 'provide static tags that is attached as InfluxDB Tag to every point. Can be used multiple times. Example: --static-tag.foo=bar --static-tag.baz=qux')
    .alias({
        h: 'help',
        m: 'mqtt-url',
        i: 'influxdb-host',
        v: 'verbosity',
    })
    .default({
        'mqtt-prefix': 'dersimn/' + pkg.name,
        'mqtt-url': 'mqtt://host.docker.internal',
        'influxdb-url': 'http://host.docker.internal:8086/mqtt',
        subscription: [
            '#',
        ],
        'chunk-size': 5000,
        'max-interval': 3,
    })
    .version()
    .help('help')
    .argv;
const mqtt = require('mqtt');
const Influx = require('influx');
const processMessage = require('./lib/process-message.js');

log.setLevel(config.verbosity);
log.info(pkg.name + ' ' + pkg.version + ' starting');
log.debug('loaded config: ', config);

const pointBuffer = [];

const influx = new Influx.InfluxDB(config.influxdbUrl);

log.info('mqtt trying to connect', config.mqttUrl);
const client = mqtt.connect(config.mqttUrl, {
    log(...args) {
        log.debug(...args);
    },
    will: {
        topic: config.mqttPrefix + '/online',
        payload: 'false',
        retain: true,
    },
    protocolVersion: 5,
});

client.on('connect', () => {
    log.info('mqtt connected', config.mqttUrl);

    client.publish(config.mqttPrefix + '/online', 'true', {retain: true});

    for (const topic of config.subscription) {
        log.debug('mqtt subscribing ' + topic);
        client.subscribe(topic, {
            rh: 2, // Don't send retained messages at the time of the subscribe
            nl: true, // Don't send us back our own messages
            rap: true, // Received messages will keep the retain flag they were published with
        }, error => {
            if (error) {
                log.error('mqtt subscribe ' + topic, error);
            } else {
                log.info('mqtt subscribed ' + topic);
            }
        });
    }
});

client.on('close', () => {
    log.warn('mqtt closed');
});

client.on('error', err => {
    log.error('mqtt error', err.message);
});

client.on('message', (topic, payload, packet) => {
    const receiveTimestamp = new Date();

    // Build InfluxDB Datapoint
    const point = processMessage(topic, packet, receiveTimestamp, {
        'mqtt.url': config.mqttUrl,
        ...config.staticTag,
    });
    log.debug('point >', point);
    pointBuffer.push(point);

    if (pointBuffer.length > config.chunkSize) {
        setImmediate(write);
    }
});

const writeInterval = setInterval(write, config.maxInterval * 1000);
function write() {
    const chunk = pointBuffer.splice(0, config.chunkSize);
    if (chunk.length === 0) {
        return;
    }

    // Write Datapoints
    influx.writePoints(chunk).then(() => {
        log.debug('influx >', chunk.length);
    }).catch(error => {
        log.warn('influx >', chunk.length, error.message);
    });
}

process.on('SIGINT', () => {
    log.info('received SIGINT');
    stop();
});
process.on('SIGTERM', () => {
    log.info('received SIGTERM');
    stop();
});
async function stop() {
    clearInterval(writeInterval);

    // MQTT
    client.publish(config.mqttPrefix + '/online', 'false', {retain: true});
    client.end();

    // InfluxDB
    try {
        await influx.writePoints(pointBuffer);
        log.debug('influx >', pointBuffer.length);
    } catch (error) {
        log.error('influx >', pointBuffer.length, error);
    }

    log.debug('exiting..');
    process.exit(0);
}
