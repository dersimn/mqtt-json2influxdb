const message = {
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
};

function processKeyValue(value, key = 'value') {
    const tmp = {};
    
    if (typeof value === 'boolean') {
        tmp[key + '__bool'] = value;
        tmp[key + '__num'] = value ? 1 : 0;
    } else if (typeof value === 'string') {
        tmp[key + '__str'] = value;
        
        if (/^\s*(true|on|enabled{0,1})\s*$/.test(value.toLowerCase())) {
            tmp[key + '__bool'] = true;
            tmp[key + '__num'] = 1;
        }
        
        if (/^\s*(false|off|disabled{0,1})\s*$/.test(value.toLowerCase())) {
            tmp[key + '__bool'] = false;
            tmp[key + '__num'] = 0;
        }
        
        const numericValue = Number(value);
        if (!Number.isNaN(numericValue)) {
            tmp[key + '__num'] = numericValue;
        }
    } else if (typeof value === 'number') {
        tmp[key + '__num'] = value;
    }
    
    return tmp;
}

let result = {};
Object.keys(message).forEach(key => {
    result = {
        ...result,
        ...processKeyValue(message[key], key)
    };
});

console.log(result)
console.log(processKeyValue('someString'))
console.log(processKeyValue(42))
console.log(processKeyValue(3.14))
console.log(processKeyValue('42'))
console.log(processKeyValue('3.14'))
console.log(processKeyValue('100 Räuber'))
console.log(processKeyValue(true))
console.log(processKeyValue(false))
console.log(processKeyValue('true'))
console.log(processKeyValue('false'))
console.log(processKeyValue('enable'))
console.log(processKeyValue('disable'))
console.log(processKeyValue('on'))
console.log(processKeyValue('off'))
console.log(processKeyValue('ON'))
console.log(processKeyValue('OFF'))
console.log(processKeyValue(null))
console.log(processKeyValue(undefined))
