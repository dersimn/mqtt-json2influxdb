function processKeyValue(value, key = 'val') {
    const tmp = {};

    if (typeof value === 'boolean') {
        tmp[key + '__type'] = 'boolean';
        tmp[key + '__boolean'] = value;
        tmp[key + '__number'] = value ? 1 : 0;
    } else if (typeof value === 'string') {
        tmp[key + '__type'] = 'string';
        tmp[key + '__string'] = value;

        if (/^\s*(true|on(line)?|enabled?|ok|yes)\s*$/.test(value.toLowerCase())) {
            tmp[key + '__boolean'] = true;
            tmp[key + '__number'] = 1;
        }

        if (/^\s*(false|off(line)?|disabled?|fail|no)\s*$/.test(value.toLowerCase())) {
            tmp[key + '__boolean'] = false;
            tmp[key + '__number'] = 0;
        }

        const numericValue = Number.parseFloat(value);
        if (!Number.isNaN(numericValue)) {
            tmp[key + '__number'] = numericValue;
        }
    } else if (typeof value === 'number') {
        tmp[key + '__type'] = 'number';
        tmp[key + '__number'] = value;
    } else if (value === null) {
        tmp[key + '__type'] = 'null';
    }

    return tmp;
}

module.exports = processKeyValue;
