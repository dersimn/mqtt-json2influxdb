Dumps MQTT messages to InfluxDB using InfluxQL (for InfluxDB < 2.0). Messages will be parsed according to a loose implementation of the MQTT Smarthome convention (see below).

## Usage

### Docker

```
docker run -d --restart=always --name=mqtt-json2influxdb \
    dersimn/mqtt-json2influxdb \
    --mqtt-url mqtt://10.1.1.50 \
    --influxdb-url http://10.1.1.50:8086/mqtt
```

Run `docker run --rm dersimn/mqtt-json2influxdb -h` for a list of options.

## MQTT Smarthome → InfluxDB Type Conversions 

MQTT Smarthome allows JSON, String and empty payloads (null).  
InfluxDB allows storing the basic data types: (null), bool, uint, int, float, string, bytes. 

### JSON-compatible Strings as Payload

    null → __type = "null"

    42 → __type = "number"
         __number = 42

    [42, "foo", 3.14, false] → __type = "array"
                               0__type = "number"
                               0__number = 42
                               1__type = "string"
                               1__string = "foo"
                               2__type = "number"
                               2__number = 3.14
                               3__type = "boolean"
                               3__boolean = false
                               3__number = 0

    {"foo": "bar"} → __type = "object"
                     foo__type = "string"
                     foo__string = "bar"

### Unquoted Strings

    foo bar → __type = "string"
              __string = "foo bar"

### Empty Payload

    <zero bytes payload> → __type = "null"

### Additional Type Conversions

- `boolean` → `number` (`0`, `1`), because Grafana can't display boolean values in a graph using InfluxQL (it only works using Flux + InfluxDB 2.x).
- We also try to convert `string` → `number`.
- Special strings like `yes`/`no`, `on`/`off`, … will be converted to boolean values.

## Development

### Build

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

### Testing

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
