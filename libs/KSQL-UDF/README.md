
# ksql query - For Trajectory processing

# ./gradlew clean shadowJar 2>/dev/null || gradle clean shadowJar
## Raw data stream
This quries are not executed automatically.

``` sql
CREATE STREAM COLLECTION_STREAM (
    type VARCHAR,
    features ARRAY<STRUCT<type VARCHAR, id Double, geometry STRUCT<type VARCHAR, coordinates ARRAY<DOUBLE>>, "properties" STRUCT<time VARCHAR, velocity ARRAY<DOUBLE>, class_name VARCHAR>>>
)
WITH(kafka_topic='FOSS4gWorkshop2026', value_format='json');
```

``` sql
CREATE STREAM FEATURE_STREAM WITH(partitions=8) AS SELECT EXPLODE(features) AS FEATURE FROM COLLECTION_STREAM;
```

``` sql
CREATE STREAM POINT_STREAM
WITH (kafka_topic='POINT_STREAM', value_format='json', partitions=8)
AS SELECT
    FEATURE->type AS TYPE,
    FEATURE->id as ID,
    FEATURE->geometry as GEOMETRY,
    FEATURE->"properties" as "properties"
FROM FEATURE_STREAM
EMIT CHANGES;
```

```sql
CREATE STREAM ALL_STREAM (type VARCHAR, id DOUBLE, geometry STRUCT<type VARCHAR, coordinates ARRAY<DOUBLE>>, "properties" STRUCT<TIME VARCHAR(STRING), VELOCITY ARRAY<DOUBLE>, CLASS_NAME VARCHAR(STRING)>)WITH (KAFKA_TOPIC='ALL_STREAM', VALUE_FORMAT='JSON');
```
<br>   

