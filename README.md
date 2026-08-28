# SensorBoard

SensorBoard is a web-based visualization application for streaming and analyzing Moving Feature data.

The demo environment combines **Apache Kafka**, **ksqlDB**, a **Kafka publisher**, an **API server**, and a browser-based frontend to visualize moving objects and execute spatial aggregation queries using **GeoHash** and **PDCode**.

---

## Requirements

Make sure the following tools are installed before setting up the project.

| Tool               | Recommended Version | Purpose                                              |
| ------------------ | ------------------: | ---------------------------------------------------- |
| Python             |               3.11+ | Kafka publisher                                      |
| uv                 |              Latest | Python dependency and virtual environment management |
| Java               |                 17+ | API server                                           |
| Gradle             |              7.6.4+ | Required only when rebuilding Java projects          |
| Docker             |       Latest stable | Kafka / ksqlDB environment                           |
| Docker Compose     |                 v2+ | Container orchestration                              |
| Visual Studio Code |              Latest | Frontend development and demo                        |
| Live Server        |              Latest | Serving the frontend locally                         |

> The pre-built `api-server.jar` requires **Java 17 or later**.

You can verify the installed versions with:

```sh
python --version
uv --version
java -version
docker --version
docker compose version
```

---

## Installation

Clone the repository:

```sh
git clone git@github.com:datloom/SensorBoard.git
cd SensorBoard
```

The demo components are located under the `run` directory.

```text
SensorBoard/
├── frontend/
├── libs/
└── run/
    ├── streaming-infra/
    ├── kafka-publisher/
    └── api-server/
```

---

# Demo Environment Setup

The demo consists of four main components:

1. Kafka + ksqlDB streaming infrastructure
2. Kafka data publisher
3. API server
4. SensorBoard frontend

It is recommended to start them in this order.

---

## 1. Start the Streaming Infrastructure

Move to the streaming infrastructure directory:

```sh
cd SensorBoard/run/streaming-infra
```

Start Kafka, ksqlDB, and the Kafka UI:

```sh
docker compose up -d
```

Check the container status:

```sh
docker compose ps
```

Wait until Kafka and the ksqlDB server report a healthy status.

The environment includes:

| Service       | Address                 | Description                 |
| ------------- | ----------------------- | --------------------------- |
| Kafka         | `localhost:9092`        | Kafka broker                |
| ksqlDB Server | `http://localhost:8088` | ksqlDB REST API             |
| Kafka UI      | `http://localhost:8090` | Web UI for Kafka and ksqlDB |
| ksqlDB CLI    | Internal container      | Interactive ksqlDB shell    |

Open the following URL in your browser:

```text
http://localhost:8090
```

The Kafka UI can be used to inspect Kafka topics, messages, consumer groups, and ksqlDB information.

### Access the ksqlDB CLI

If needed, connect directly to the ksqlDB CLI:

```sh
docker compose exec ksqldb-cli ksql http://ksqldb-server:8088
```

Useful commands include:

```sql
SHOW TOPICS;
SHOW STREAMS;
SHOW QUERIES;
```

---

## 2. Set Up the Kafka Publisher

Move to the Kafka publisher directory:

```sh
cd SensorBoard/run/kafka-publisher
```

The publisher uses **uv** to manage its Python environment.

Create the virtual environment and install all dependencies defined in `pyproject.toml` and `uv.lock`:

```sh
uv sync
```

Activate the virtual environment:

```sh
source .venv/bin/activate
```

Alternatively, commands can be executed directly through `uv` without activating the virtual environment:

```sh
uv run python local/create_topic.py
```

### Create the Demo Kafka Topic

Create the predefined Kafka topic:

```sh
python local/create_topic.py
```

If the topic already exists, the script will leave it unchanged.

---

## 3. Start the API Server

Move to the API server directory:

```sh
cd SensorBoard/run/api-server
```

Start the pre-built Spring Boot API server:

```sh
java -jar api-server.jar
```

### Java Requirement

The provided JAR is compiled for **Java 17**.

Verify your Java version:

```sh
java -version
```

The output should indicate Java 17 or later.

For example:

```text
openjdk version "17..."
```

### Using Java 17 Explicitly on macOS

If multiple Java versions are installed, set Java 17 as the active version for the current terminal session:

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"

java -version
java -jar api-server.jar
```

You can also run the application directly using a Java 17 installation:

```sh
"$(/usr/libexec/java_home -v 17)/bin/java" -jar api-server.jar
```

---

## 4. Start the Frontend

Open **Visual Studio Code** and select the `SensorBoard` project directory.

Install the **Live Server** extension if it is not already installed.

Then:

1. Open the `frontend` directory.
2. Click **Go Live** in the bottom-right corner of Visual Studio Code.
3. Your default web browser should open automatically(or connect to `localhost:5500`).
4. Navigate to the frontend application if it is not opened automatically.
5. Confirm that the SensorBoard web application is displayed correctly.

---

# Running the Demo

Once all required services are running, follow the steps below.

---

## 1. Create the ksqlDB Streams

In the SensorBoard web application, execute the following queries **in order**.

### Step 1 — Create the Collection Stream

```sql
CREATE STREAM COLLECTION_STREAM (
    type VARCHAR,
    features ARRAY<
        STRUCT<
            type VARCHAR,
            id DOUBLE,
            geometry STRUCT<
                type VARCHAR,
                coordinates ARRAY<DOUBLE>
            >,
            "properties" STRUCT<
                time VARCHAR,
                velocity ARRAY<DOUBLE>,
                class_name VARCHAR
            >
        >
    >
)
WITH (
    KAFKA_TOPIC='FOSS4gWorkshop2026',
    VALUE_FORMAT='JSON'
);
```

This stream consumes the original Moving Feature collection messages published to the `FOSS4gWorkshop2026` Kafka topic.

### Step 2 — Expand Features

```sql
CREATE STREAM FEATURE_STREAM
WITH (PARTITIONS=8)
AS
SELECT
    EXPLODE(features) AS FEATURE
FROM COLLECTION_STREAM;
```

`EXPLODE` converts each element of the `features` array into an individual stream record.

### Step 3 — Create the Point Stream

```sql
CREATE STREAM POINT_STREAM
WITH (
    KAFKA_TOPIC='POINT_STREAM',
    VALUE_FORMAT='JSON',
    PARTITIONS=8
)
AS
SELECT
    FEATURE->type AS TYPE,
    FEATURE->id AS ID,
    FEATURE->geometry AS GEOMETRY,
    FEATURE->"properties" AS "properties"
FROM FEATURE_STREAM
EMIT CHANGES;
```

The resulting `POINT_STREAM` contains individual Moving Feature records that can be consumed by the SensorBoard visualization pipeline.

---

## 2. Connect the Web Application to the API Server

Click the **RUN** button in the SensorBoard web application.

This connects the frontend to the API server and starts the streaming visualization workflow.

> **Important**
>
> Start the demo before manually moving or changing the map position.
>
> If the map has already been moved, refresh the browser page and click **RUN** again before starting the Kafka publisher.

---

## 3. Start the Kafka Publisher

Open another terminal and move to the Kafka publisher directory:

```sh
cd SensorBoard/run/kafka-publisher
```

Activate the virtual environment:

```sh
source .venv/bin/activate
```

Then start the demo data publisher:

```sh
python local/post_mfjson_taxi.py
```

Alternatively:

```sh
uv run python local/post_mfjson_taxi.py
```

The publisher sends the prepared Moving Feature demo data to Kafka.

Check the terminal logs to verify that messages are being published successfully.

You can also verify the published data through the Kafka UI:

```text
http://localhost:8090
```

---

## 4. Verify the Visualization

Return to the SensorBoard web application.

If the demo is running correctly, moving objects should appear and travel along the road network on the map.

The visualization is updated continuously as data arrives through the Kafka and ksqlDB streaming pipeline.

When the publisher reaches the end of the demo dataset, run the publisher again to replay the data:

```sh
python local/post_mfjson_taxi.py
```

or:

```sh
uv run python local/post_mfjson_taxi.py
```

---

# Aggregation Queries

SensorBoard supports spatial **Aggregation Queries** based on:

* **GeoHash**
* **PDCode**

For the workshop/demo environment, using the default settings is recommended.

---

## Resolution

The `Resolution` parameter controls the size of the spatial cells used for aggregation.

A **higher resolution value produces smaller spatial cells**.

As the cells become smaller, more cells must be processed. This increases computational and visualization overhead.

Because the demo environment has limited resources, excessively high resolutions may significantly slow down the application or cause the aggregation process to stop.

### Recommended Demo Settings

| Method  | Recommended Resolution |
| ------- | ---------------------: |
| GeoHash |              **7 – 8** |
| PDCode  |            **17 – 18** |

These values provide a reasonable balance between spatial detail and processing cost for the provided demo dataset.

---

## Running an Aggregation Query

Configure the desired aggregation parameters in the SensorBoard interface and execute the **Aggregation Query**.

When the query is created successfully, aggregation cells will appear as a new layer on the map.

The visualization will update as aggregated streaming data is received.

---

## Aggregation Query Limitations

Only **one Aggregation Query can be active at a time** in the current demo environment.

Before executing a new Aggregation Query, the existing query must be removed.

### Removing the Current Aggregation Query

When an Aggregation Query is started, a corresponding layer is added to the map.

To remove it:

1. Locate the aggregation layer in the layer list.
2. Click the **Delete** icon for that layer.
3. Confirm that the existing aggregation visualization has been removed.
4. Create and run the new Aggregation Query.

---

# Stopping the Demo Environment

Stop the Kafka and ksqlDB containers:

```sh
cd SensorBoard/run/streaming-infra
docker compose down
```

This removes the containers while preserving Kafka data stored in the Docker volume.

To completely reset the streaming environment, including Kafka topics and stored messages:

```sh
docker compose down -v
```

Then recreate the environment:

```sh
docker compose up -d
```

> `docker compose down -v` permanently removes the Kafka data stored in the project's Docker volume.

---

# Troubleshooting

## Check Docker Services

```sh
docker compose ps
```

Kafka and the ksqlDB server should be healthy before starting the demo.

View all logs:

```sh
docker compose logs -f
```

View only the ksqlDB Server logs:

```sh
docker compose logs -f ksqldb-server
```

---

## Check the ksqlDB Server

Verify the REST API:

```sh
curl http://localhost:8088/info
```

---

## Check Kafka Topics

Using the ksqlDB CLI:

```sql
SHOW TOPICS;
```

Or using Kafka directly:

```sh
docker compose exec kafka \
  kafka-topics \
  --bootstrap-server kafka:29092 \
  --list
```

---

## Java Version Error

If the API server reports an error similar to:

```text
UnsupportedClassVersionError:
... has been compiled by a more recent version of the Java Runtime
```

verify that Java 17 or later is being used:

```sh
java -version
```

On macOS:

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

Then restart the API server.

---

## Reset the Demo

If Kafka topics, ksqlDB streams, or persistent queries from a previous run interfere with the demo, reset the streaming environment:

```sh
cd SensorBoard/run/streaming-infra

docker compose down -v
docker compose up -d
```

After the services become healthy:

1. Recreate the Kafka topic.
2. Recreate the ksqlDB streams.
3. Restart the API server.
4. Refresh the SensorBoard frontend.
5. Click **RUN**.
6. Start the Kafka publisher again.

---

# Notes

* The included Docker Compose configuration is intended for **development, workshops, demonstrations, and testing**, not production deployment.
* Kafka runs as a **single broker in KRaft mode** without ZooKeeper.
* Kafka and ksqlDB replication factors are configured as `1`.
* The Python environment is reproducible using `pyproject.toml` and `uv.lock`.
* The `.venv` directory should not be committed to Git.
* The API server is distributed as a pre-built executable JAR and requires Java 17 or later.
* The Kafka UI is available at `http://localhost:8090`.
* Only one Aggregation Query should be active at a time in the current demo environment.
