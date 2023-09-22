#!/usr/bin/env node

const pkg = require('./package.json');
const log = require('yalm');
const config = require('yargs')
    .env(pkg.name.replace(/[^a-zA-Z\d]/, '_').toUpperCase())
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('verbosity', 'possible values: "error", "warn", "info", "debug"')
    .describe('mqtt-url', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('influxdb-url', 'url to InfluxDB, e.g.: http://user:password@host:8086/database')
    .describe('subscription', 'array of topics to subscribe').array('subscription')
    .describe('chunk-size', 'maximum number of points to buffer before writing to InfluxDB')
    .describe('max-interval', 'maximum time to wait if chunk size is not completely filled before writing to InfluxDB anyway')
    .alias({
        h: 'help',
        m: 'mqtt-url',
        i: 'influxdb-host',
        v: 'verbosity'
    })
    .default({
        'mqtt-url': 'mqtt://host.docker.internal',
        'influxdb-url': 'http://host.docker.internal:8086/mqtt',
        subscription: [
            '#'
        ],
        'chunk-size': 5000,
        'max-interval': 3
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

const pointBuffer = [];

const influx = new Influx.InfluxDB(config.influxdbUrl);

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

    // Build InfluxDB Datapoint
    const point = processMessage(topic, message, packet, receiveTimestamp);
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
    mqtt.end();
    try {
        await influx.writePoints(pointBuffer);
        log.debug('influx >', pointBuffer.length);
    } catch (error) {
        log.error('influx >', pointBuffer.length, error.message);
    }

    log.debug('exiting..');
    process.exit(0);
}
