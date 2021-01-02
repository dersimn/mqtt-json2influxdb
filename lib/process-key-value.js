function processKeyValue(value, key = 'val') {
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

module.exports = processKeyValue;
