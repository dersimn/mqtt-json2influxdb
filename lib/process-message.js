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

        // Provide type casted versions
        Object.keys(flatMessage).forEach(key => {
            fieldSet = {
                ...fieldSet,
                ...processKeyValue(flatMessage[key], key)
            };
        });

        point.fields = fieldSet;
        point.fields.__type = Array.isArray(message) ? 'array' : 'object';
    } else if (packet.payload.length === 0) {
        point.fields.__type = 'empty';
    } else {
        point.fields = processKeyValue(message);
    }

    return point;
}

module.exports = processMessage;
