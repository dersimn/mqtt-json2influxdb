Dumps MQTT messages to InfluxDB using InfluxQL (for InfluxDB < 2.0). Messages will be parsed according to a loose implementation of the MQTT Smarthome convention (see below).

## Usage

### Docker

```
docker run -d --restart=always --name=mqsh2influx \
    dersimn/mqsh2influx \
    --mqtt-url mqtt://10.1.1.50 \
    --influxdb-url http://10.1.1.50:8086/mqtt
```

Run `docker run --rm dersimn/mqsh2influx -h` for a list of options.

## MQTT Smarthome → InfluxDB Type Conversions 

MQTT Smarthome allows JSON, String and empty payloads (null).  
InfluxDB allows storing the basic data types: (null), bool, uint, int, float, string, bytes. 

### JSON-compatible Strings as Payload

    null → val__type = "null"

    42 → val__type = "number"
         val__number = 42

    [42, "foo", 3.14, false] → 0__type = "number"
                               0__number = 42
                               1__type = "string"
                               1__string = "foo"
                               2__type = "number"
                               2__number = 3.14
                               3__type = "boolean"
                               3__boolean = false
                               3__number = 0

    {"foo": "bar"} → foo__type = "string"
                   → foo__string = "bar"

### Unquoted Strings

    foo bar → val__type = "string"
              val__string = "foo bar"

### Empty Payload

    <zero bytes payload> → val__type = "null"

### MQTT Smarthome specific JSON keys

- `ts` will be treated as timestamp if the difference is < 5s.  
  Otherwise we'll store `ts` as field key and tag it with `valid_timestamp = false` for debugging.
- `lc` will be removed.

### Additional Type Conversions

- `boolean` → `number` (`0`, `1`), because Grafana can't display boolean values in a graph using InfluxQL (it only works using Flux + InfluxDB 2.x in the future).
- We also try to convert `string` → `number`.
- Special strings like `yes`/`no`, `on`/`off`, … will be converted to boolean values.

## Development

### Build

Docker development build:

    docker build -t mqsh2influx .
    docker run --rm mqsh2influx -v debug --mqtt-url mqtt://host.docker.internal --influxdb-url http://host.docker.internal:8086/mqtt

Docker Hub deploy:

    docker buildx create --name mybuilder
    docker buildx use mybuilder
    docker buildx build --platform linux/amd64,linux/arm/v7 \
        -t dersimn/mqsh2influx \
        -t dersimn/mqsh2influx:2 \
        -t dersimn/mqsh2influx:2.x \
        -t dersimn/mqsh2influx:2.x.x \
        --push .

### Testing

MQTT:

    docker run -d --rm --name=mqtt -p 1883:1883 -p 9001:9001 -v "$(pwd)/contrib/mosquitto.conf":/mosquitto/config/mosquitto.conf:ro eclipse-mosquitto

InfluxDB:

    docker run -d --rm --name=influxdb -p 8086:8086 -e INFLUXDB_DB=mqtt influxdb:1.8-alpine

Grafana:

    docker run -d --rm --name=grafana -p 3000:3000 -e "GF_SERVER_ROOT_URL=http://10.1.1.100:3000" -e "GF_USERS_ALLOW_SIGN_UP=false" -e "GF_USERS_DEFAULT_THEME=light" -e "GF_AUTH_ANONYMOUS_ENABLED=true" -e "GF_AUTH_BASIC_ENABLED=false" -e "GF_AUTH_ANONYMOUS_ORG_ROLE=Admin" grafana/grafana

For a simple simulation environment consider also running:

    docker run -d --restart=always --name=logic -e "TZ=Europe/Berlin" -v "$(pwd)/contrib/scripts":/scripts:ro dersimn/mqtt-scripts:1 --url mqtt://host.docker.internal --dir /scripts
    docker rm -f logic
