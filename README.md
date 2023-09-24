Dumps MQTT messages to InfluxDB using InfluxQL (for InfluxDB < 2.0).  
It tries to parse JSON formatted messages with a fallback for raw strings (e.g. unquoted strings sent over MQTT).

# Usage

## Docker

```
docker run -d \
    --restart=always \
    --name=mqtt-json2influxdb \
    --add-host=host.docker.internal:host-gateway \
    dersimn/mqtt-json2influxdb \
        --mqtt-url mqtt://host.docker.internal \
        --influxdb-url http://username:password@host.docker.internal:8086/databasename
```

Run `docker run --rm dersimn/mqtt-json2influxdb -h` for a list of options.

### ENVs

If you prefer configuring the script by ENVs the upper command can also be written as:

```
docker run -d \
    --restart=always \
    --name=mqtt-json2influxdb \
    --add-host=host.docker.internal:host-gateway \
    -e MQTTJSON2INFLUXDB_MQTT_URL=mqtt://host.docker.internal \
    -e MQTTJSON2INFLUXDB_INFLUXDB_URL=http://username:password@host.docker.internal:8086/databasename \
    dersimn/mqtt-json2influxdb
```

# InfluxDB Type Conversions 

MQTT allows sending all types of binary data, but most users use it to send UTF-8 encoded strings or JSON strings.  
The InfluxDB line protocol (used by InfluxDB v1) allows storing the basic data types: [floats, integers, strings, or Booleans](https://docs.influxdata.com/influxdb/v1/write_protocols/line_protocol_reference/#syntax-description) - but not objects or arrays.  

A big problem with InfluxDB is that you can't switch data types. A field key once filled with an integer cannot be used to store a string afterwards. Therefore the data type is appended behind each field key and sometimes it is also tried to convert the data types. What I've tried to do here is to find a format that works in most cases and that allows you to store everything in an MQTT message without having to think too much.

For example, if you send the string `42` (without quotes) to topic `test/topic`, it can be interpreted as a JSON formatted number, so it will be written to InfluxDB: measurement=`test/topic`, field-key1=`payload__integer`, field-value1=`42` (as float). Because JSON does not distinguish between float and integer, JSON-numbers are always stored as InfluxDB-float.

If a larger JSON object is sent via MQTT, multiple field-key/value pairs are written per InfluxDB measurement, for example: `{"foo":42, "bar": "baz"}` → measurement=`test/topic`, field-key1=`payload.foo__integer`, field-value1=`42`, field-key2=`payload.bar__string`, field-value2=`"baz"`.

## Example conversions

    null → payload__type = "null"

    <zero bytes payload> → payload__type = "empty"

    true → payload__type = "boolean"
           payload__boolean = true
           payload__number = 1

    42 → payload__type = "number"
         payload__number = 42

    "42" → payload__type = "string"
           payload__string: "42"
           payload__number: 42

_Note:_ A quoted string `"42"` will be interpreted as JSON-string, a `42` (without quotes) will be interpreted as JSON-integer. For un-quoted strings that can't be converted to a JSON data type, we use `raw-string` in `payload__type`:

    foo → payload__type = "raw-string"
          payload__string = "foo"

    "foo" → payload__type = "string"
            payload__string = "foo"

    [42, "foo", 3.14, false] → payload__type = "array"
                               payload.0__type = "number"
                               payload.0__number = 42
                               payload.1__type = "string"
                               payload.1__string = "foo"
                               payload.2__type = "number"
                               payload.2__number = 3.14
                               payload.3__type = "boolean"
                               payload.3__boolean = false
                               payload.3__number = 0

    {"foo": "bar"} → payload__type = "object"
                     payload.foo__type = "string"
                     payload.foo__string = "bar"

    {"foo": {"bar": "baz"}} → payload__type = "object"
                              payload.foo.bar__type = "string"
                              payload.foo.bar__string = "baz"

    [1,[2,3,],{"foo": "bar"}] → payload__type = "array"
                                payload.0__type = "number"
                                payload.0__number = 1
                                payload.1.0__type = "number"
                                payload.1.0__number = 2
                                payload.1.1__type = "number"
                                payload.1.1__number = 3
                                payload.2.foo__type = "string"
                                payload.2.foo__string = "bar"

## Additional Type Conversions

- `boolean` → `number` (`0`, `1`), because Grafana can't display boolean values in a graph using InfluxQL (it only works using Flux with InfluxDB 2.x).
- We also try to convert `string` → `number`.
- Special strings like `yes`/`no`, `on`/`off`,… will be converted to boolean values.

# Development

## Build

Docker development build:

    docker build -t mqtt-json2influxdb .
    docker run --rm mqtt-json2influxdb -v debug --mqtt-url mqtt://host.docker.internal --influxdb-url http://host.docker.internal:8086/mqtt

Docker Hub deploy:

    docker buildx create --name mybuilder
    docker buildx use mybuilder
    docker buildx build \
        --platform linux/amd64,linux/arm/v7 \
        -t dersimn/mqtt-json2influxdb \
        -t dersimn/mqtt-json2influxdb:2 \
        -t dersimn/mqtt-json2influxdb:2.x \
        -t dersimn/mqtt-json2influxdb:2.x.x \
        --push .

## Testing

MQTT:

    docker run -d --rm --name=mqtt -p 1883:1883 -p 9001:9001 -v "$(pwd)/contrib/mosquitto.conf":/mosquitto/config/mosquitto.conf:ro eclipse-mosquitto

InfluxDB v1:

    docker run -d --rm --name=influxdb -p 8086:8086 -e INFLUXDB_DB=mqtt influxdb:1.8-alpine
    docker run --rm mqtt-json2influxdb -v debug --mqtt-url mqtt://host.docker.internal --influxdb-url http://host.docker.internal:8086/mqtt

InfluxDB v2:

    docker run -d --rm --name influxdb-v2 -p 8086:8086 influxdb:alpine
    docker exec influxdb-v2 influx setup -u myuser -p mypassword -t mytoken -o myorg -b mqtt -f
    docker exec influxdb-v2 influx auth create --all-access --org myorg --token mytoken
    docker exec influxdb-v2 influx bucket list
    docker exec influxdb-v2 influx v1 auth create --username v1user --password v1password --org myorg --write-bucket <BUCKET_ID>
    docker run --rm mqtt-json2influxdb -v debug --mqtt-url mqtt://v1user:v1password@host.docker.internal --influxdb-url http://host.docker.internal:8086/mqtt

Grafana:

    docker run -d --rm --name=grafana -p 3000:3000 -e "GF_SERVER_ROOT_URL=http://localhost:3000" -e "GF_USERS_ALLOW_SIGN_UP=false" -e "GF_USERS_DEFAULT_THEME=light" -e "GF_AUTH_ANONYMOUS_ENABLED=true" -e "GF_AUTH_BASIC_ENABLED=false" -e "GF_AUTH_ANONYMOUS_ORG_ROLE=Admin" grafana/grafana

Generate Simulation Data:

    docker run -d --restart=always --name=logic -e "TZ=Europe/Berlin" -v "$(pwd)/contrib/scripts":/scripts:ro dersimn/mqtt-scripts:1 --url mqtt://host.docker.internal --dir /scripts
    docker rm -f logic
