const point = {
    fields: {
        someString: 'foo',
        someStringInt: '42',
        someStringFloat: '3.14',
        someStringMixed: '100 Räuber',
        someStringBool: 'true',
        someStringBoolFalse: 'false',
        someStringNull: 'null',
        someStringEnabled: 'enabled',
        someStringEnabledddd: 'enabledddd',
        someStringEnable: 'enable',
        someStringOn: 'on',
        someStringON: 'ON',
        someStringDisabled: 'disabled',
        someStringDisable: 'disable',
        someStringOff: 'off',
        someStringOnSpaces: ' on   ',
        someBool: true,
        someBoolFalse: false,
        someNull: null,
        someUndefined: undefined,
        someNumber: 42,
        someNumberFloat: 3.14
    }
};

const begin = Date.now();

Object.keys(point.fields).forEach(key => {
//for (const key in point.fields) {
    console.log(key);
    
    // Provide type casted versions
    if (typeof point.fields[key] === 'boolean') {
        point.fields['__num__' + key] = point.fields[key] ? 1 : 0;
    }

    if (typeof point.fields[key] === 'string') {
        const value = point.fields[key];
        
        const numericValue = Number(value);
        if (!Number.isNaN(numericValue)) {
            point.fields['__num__' + key] = numericValue;
        }

        if (/^\s*(true|on|enable[d]{0,1})\s*$/.test(value.toLowerCase())) {
            point.fields['__bool__' + key] = true;
            point.fields['__num__' + key] = 1;
        }
        
        if (/^\s*(false|off|disable[d]{0,1})\s*$/.test(value.toLowerCase())) {
            point.fields['__bool__' + key] = false;
            point.fields['__num__' + key] = 0;
        }
    }
//}
});

const end = Date.now()

console.log(point)
console.log(end-begin)