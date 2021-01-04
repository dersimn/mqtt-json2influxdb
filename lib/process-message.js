const processKeyValue = require('./process-key-value.js');
const Influx = require('influx');
const flatten = require('flat');

function processMessage(topic, message, packet, receiveTimestamp) {
    const point = {};
    point.measurement = Influx.escape.measurement(topic);
    point.timestamp = receiveTimestamp;
    point.tags = {
        retain: packet.retain
    };

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
        point.fields = processKeyValue(null);
        point.fields.__payload__type = 'empty';
    } else if (message === null) {
        point.fields = processKeyValue(null);
        point.fields.__payload__type = 'null';
    } else {
        point.fields = processKeyValue(message);
        point.fields.__payload__type = typeof message;
    }

    return point;
}

module.exports = processMessage;
