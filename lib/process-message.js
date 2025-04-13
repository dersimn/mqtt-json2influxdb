const Influx = require('influx');
const flatten = require('flat');
const processKeyValue = require('./process-key-value.js');

function processMessage(topic, packet, receiveTimestamp, staticTags) {
    const point = {};
    point.measurement = Influx.escape.measurement(topic);
    point.timestamp = receiveTimestamp;
    point.tags = {
        'mqtt.retain': packet.retain,
        'mqtt.qos': packet.qos,
        'mqtt.dup': packet.dup,
        ...staticTags,
    };

    // Empty Message
    if (packet.payload.length === 0) {
        point.fields = {
            payload__type: 'empty',
        };
        return point;
    }

    // Try parsing
    try {
        const message = JSON.parse(packet.payload);

        if (typeof message === 'object' && message !== null) {
            const flatMessage = flatten(message);
            let fieldSet = {};

            // Provide type casted versions
            for (const key of Object.keys(flatMessage)) {
                fieldSet = {
                    ...fieldSet,
                    ...processKeyValue(flatMessage[key], 'payload.' + key),
                };
            }

            point.fields = fieldSet;
            point.fields.payload__type = Array.isArray(message) ? 'array' : 'object';
        } else {
            point.fields = processKeyValue(message, 'payload');
        }
    } catch {
        try {
            const message = String(packet.payload);

            point.fields = processKeyValue(message, 'payload');
            point.fields.payload__type = 'raw-string';
        } catch {
            throw new Error('Unable to parse MQTT payload.');
        }
    }

    return point;
}

module.exports = processMessage;
