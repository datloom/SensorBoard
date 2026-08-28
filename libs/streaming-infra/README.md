# ksqlDB + Kafka Test Environment

This project provides a single-broker Kafka and ksqlDB test environment running in **KRaft mode**, without ZooKeeper.

It is intended for local development, testing, workshops, and custom ksqlDB UDF development.

## Components

| Service         | Host Port | Description                                                    |
| --------------- | --------: | -------------------------------------------------------------- |
| `kafka`         |    `9092` | Kafka broker running in KRaft mode with replication factor `1` |
| `kafka-ui`      |    `8090` | Web UI for inspecting Kafka topics, messages, and ksqlDB       |
| `ksqldb-server` |    `8088` | ksqlDB REST API server                                         |
| `ksqldb-cli`    |         - | Container for accessing the ksqlDB CLI                         |

Kafka also uses the following internal Docker ports:

|    Port | Description                                          |
| ------: | ---------------------------------------------------- |
| `29092` | Kafka broker communication inside the Docker network |
| `29093` | Kafka KRaft controller communication                 |

## Start the Environment

```bash
docker compose up -d
docker compose ps
```

Wait until the Kafka and ksqlDB Server containers report a `healthy` status.

You can inspect logs if necessary:

```bash
docker compose logs -f
```

To view only the ksqlDB Server logs:

```bash
docker compose logs -f ksqldb-server
```

## Access the ksqlDB CLI

Run:

```bash
docker compose exec ksqldb-cli ksql http://ksqldb-server:8088
```

Once connected, you can execute ksqlDB statements interactively.

## Simple Test Example

Run the following commands inside the ksqlDB CLI:

```sql
-- List Kafka topics
SHOW TOPICS;

-- Create a stream.
-- The Kafka topic will be created automatically if it does not exist.
CREATE STREAM test_stream (
  id INT,
  message VARCHAR
)
WITH (
  KAFKA_TOPIC='test_topic',
  VALUE_FORMAT='JSON',
  PARTITIONS=1
);

-- Insert test data
INSERT INTO test_stream (id, message)
VALUES (1, 'hello ksqldb');

-- Read records from the beginning
SET 'auto.offset.reset' = 'earliest';

SELECT * FROM test_stream EMIT CHANGES;
```

Press `Ctrl+C` to stop the continuous query.

You can also inspect the created streams and functions:

```sql
SHOW STREAMS;
SHOW FUNCTIONS;
```

## Test Kafka Directly

To produce messages directly to Kafka from the command line:

```bash
docker compose exec kafka \
  kafka-console-producer \
  --bootstrap-server kafka:29092 \
  --topic test_topic
```

Enter messages interactively and press `Ctrl+C` to exit.

To consume messages from the beginning:

```bash
docker compose exec kafka \
  kafka-console-consumer \
  --bootstrap-server kafka:29092 \
  --topic test_topic \
  --from-beginning
```

## Kafka Connection Addresses

Applications running on the host machine should connect to Kafka using:

```text
localhost:9092
```

For example:

```text
bootstrap.servers=localhost:9092
```

Containers running inside the same Docker Compose network should use:

```text
kafka:29092
```

The ksqlDB Server uses this internal address to connect to Kafka.

## Kafka UI

The Kafka web UI is available at:

```text
http://localhost:8090
```

It can be used to inspect:

* Kafka topics
* Messages
* Brokers
* Consumer groups
* Cluster information
* ksqlDB integration

The UI connects internally to:

```text
Kafka: kafka:29092
ksqlDB: http://ksqldb-server:8088
```

The `kafka-ui` service is optional. If it is not required, remove or disable the corresponding service block in `docker-compose.yaml`.

## ksqlDB REST API

The ksqlDB REST API is exposed on:

```text
http://localhost:8088
```

You can verify the server status with:

```bash
curl http://localhost:8088/info
```

## Custom ksqlDB UDFs

Custom ksqlDB UDF JAR files can be placed in the local:

```text
./extensions
```

directory.

The directory is mounted into the ksqlDB Server container as:

```text
/opt/ksqldb-udfs
```

The corresponding configuration is:

```yaml
KSQL_KSQL_EXTENSION_DIR: /opt/ksqldb-udfs
```

For example:

```text
.
├── docker-compose.yaml
└── extensions/
    └── ksql-custom-udf.jar
```

After adding or replacing a UDF JAR, restart the ksqlDB Server:

```bash
docker compose restart ksqldb-server
```

Then reconnect to the CLI:

```bash
docker compose exec ksqldb-cli ksql http://ksqldb-server:8088
```

Verify that the custom function was loaded:

```sql
SHOW FUNCTIONS;
```

For more information about a specific function:

```sql
DESCRIBE FUNCTION <FUNCTION_NAME>;
```

## Stop and Reset the Environment

Stop and remove the containers:

```bash
docker compose down
```

Kafka data is stored in a Docker volume and is preserved when the containers are removed.

To also remove the Kafka data volume and reset the environment completely:

```bash
docker compose down -v
```

Then start the environment again with:

```bash
docker compose up -d
```

## Persistent Kafka Data

Kafka data is stored in the named Docker volume:

```text
kafka-data
```

The volume is mounted inside the Kafka container at:

```text
/var/lib/kafka/data
```

Therefore:

```bash
docker compose down
```

removes the containers but keeps Kafka data.

Running:

```bash
docker compose down -v
```

removes both the containers and the Kafka data volume.

## Notes

* This environment uses Confluent Platform `7.7.1` images:

  * `confluentinc/cp-kafka:7.7.1`
  * `confluentinc/cp-ksqldb-server:7.7.1`
  * `confluentinc/cp-ksqldb-cli:7.7.1`
* Kafka runs in **KRaft mode**, so ZooKeeper is not required.
* This is a **single-broker** environment.
* Kafka and ksqlDB replication factors are configured as `1`.
* Kafka uses `localhost:9092` for host applications and `kafka:29092` for communication between Docker containers.
* Custom ksqlDB UDF JAR files are loaded from the `extensions` directory.
* The Kafka UI is optional and is exposed on host port `8090`.
* This configuration is intended for development, testing, demonstrations, and workshops rather than production use.
