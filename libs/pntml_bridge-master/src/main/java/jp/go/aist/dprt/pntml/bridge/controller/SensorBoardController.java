package jp.go.aist.dprt.pntml.bridge.controller;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import io.confluent.ksql.api.client.*;
import jp.go.aist.dprt.pntml.bridge.constants.KsqlDBConstants;
import jp.go.aist.dprt.pntml.bridge.constants.WebSocketConstants;
import jp.go.aist.dprt.pntml.bridge.listener.CustomKafkaListenerRegistrar;
import jp.go.aist.dprt.pntml.bridge.model.ContinuousQueryParam;
import jp.go.aist.dprt.pntml.bridge.model.CustomKafkaListenerProperty;
import jp.go.aist.dprt.pntml.bridge.model.DropQueries;
import jp.go.aist.dprt.pntml.bridge.model.RawQuery;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.ListTopicsResult;
import org.apache.kafka.clients.admin.TopicListing;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.ExecutionException;

@CrossOrigin(origins = "*", allowedHeaders = "*")
@Slf4j
@RestController
public class SensorBoardController {

    @Autowired
    private AdminClient adminClient;

    @Autowired
    private CustomKafkaListenerRegistrar customKafkaListenerRegistrar;

    @GetMapping("/tproperty")
    ResponseEntity<?> findAllTopic() throws ExecutionException, InterruptedException {
        ListTopicsResult result = adminClient.listTopics();
        Collection<TopicListing> list = result.listings().get();

        JsonArray jsonArray = new JsonArray();
        for(TopicListing topicListing : list){

            JsonObject jsonObject = new JsonObject();
            if(topicListing.name().split("_")[0].equals("sensor")) {
                jsonObject.addProperty("type", topicListing.name().split("_")[0]);
                jsonObject.addProperty("label", topicListing.name().split("_",2)[1]);
                jsonObject.addProperty("topic", topicListing.name());
                jsonArray.add(jsonObject);
            }
            else if(topicListing.name().split("_")[0].equals("property")) {
                jsonObject.addProperty("type", topicListing.name().split("_")[1]);
                jsonObject.addProperty("label", topicListing.name().split("_",3)[2]);
                jsonObject.addProperty("topic", topicListing.name());
                jsonArray.add(jsonObject);
            }
        }

        return new ResponseEntity<>(jsonArray.toString(), HttpStatus.OK);
    }

    @GetMapping("/fullStream")
    ResponseEntity<?> getSensorStream(@RequestParam List<Double> bbox) throws ExecutionException, InterruptedException {
        // String full_stream_name = "ALL_STREAM_" + UUID.randomUUID().toString().replaceAll("-","_");
        String full_stream_name = "ALL_STREAM";
        JsonArray terminateQuery = new JsonArray();

        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);
        try{   
            String query = "CREATE STREAM " + full_stream_name + " " +
                            "(type VARCHAR, " +
                            "id DOUBLE, " +
                            "geometry STRUCT<type VARCHAR, coordinates ARRAY<DOUBLE>>, " +
                            "\"properties\" STRUCT<TIME VARCHAR(STRING), VELOCITY ARRAY<DOUBLE>, CLASS_NAME VARCHAR(STRING)>)" + // need to add properties
                            "WITH (KAFKA_TOPIC='" + full_stream_name + "', VALUE_FORMAT='JSON');";
            log.info(query);
            ExecuteStatementResult queryExecutionResult = client.executeStatement(query).get();
            log.info(queryExecutionResult.toString());

            double min_lon = bbox.get(0);
            double min_lat = bbox.get(1);
            double max_lon = bbox.get(2);
            double max_lat = bbox.get(3);

            
            ListTopicsResult result = adminClient.listTopics();
            Collection<TopicListing> list = result.listings().get();
            log.info("CHOWIJAE: "+list.size());
            for(TopicListing topicListing : list){
                String streamName = topicListing.name();
                log.info(streamName);

                if(streamName.split("_")[0].equals("POINT")) {
                    query = "INSERT INTO " + full_stream_name + " " +
                            "SELECT type, id, geometry, \"properties\" FROM " + topicListing.name() + " " +
                            "WHERE " + // where coordinate in range // index start with 1 in ksqlDB
                            "(geometry->coordinates[1] BETWEEN " + min_lon + " AND " + max_lon + ") " +
                            "AND " + 
                            "(geometry->coordinates[2] BETWEEN " + min_lat + " AND " + max_lat + ") " +
                            "EMIT CHANGES;";
                    log.info(query); 
                    queryExecutionResult = client.executeStatement(query).get();
                    log.info(queryExecutionResult.toString());
                    terminateQuery.add(queryExecutionResult.queryId().get());
                    log.info("----------------"+queryExecutionResult.queryId().get());
                }


                // if(streamName.split("_")[0].equals("S")) {
                // TODO: If collected kafka topic name is to make as stream, a new stream should be generated using it

    //                try {
    //                    client.executeStatement("DROP STREAM " + streamName.toUpperCase() + ";").get();
    //                } catch (ExecutionException | InterruptedException exception) {
    //                    log.error("There is no same Stream or Table Exist :" + exception);
    //                }
    //
    //                String sql_build_stream_from_kafka = "CREATE STREAM " + streamName
    //                        + " (id INT, geometry STRUCT<type VARCHAR,coordinates ARRAY<DOUBLE>>)"
    //                        + " WITH (KAFKA_TOPIC='"+ streamName +"', VALUE_FORMAT='JSON');";
    //                log.info(sql_build_stream_from_kafka);
    //                client.executeStatement(sql_build_stream_from_kafka).get();

                //     query = "INSERT INTO " + full_stream_name + " " +
                //             "SELECT type, id, geometry, TO_JSON_STRING(\"properties\") AS \"properties\" FROM " + streamName + " " +
                //             "WHERE " + // where coordinate in range // index start with 1 in ksqlDB
                //             "(geometry->coordinates[1] BETWEEN " + min_lon + " AND " + max_lon + ") " +
                //             "AND " +
                //             "(geometry->coordinates[2] BETWEEN " + min_lat + " AND " + max_lat + ") " +
                //             "EMIT CHANGES;";
                //     log.info(query);
                //     queryExecutionResult = client.executeStatement(query).get();
                //     log.info(queryExecutionResult.toString());
                //     terminateQuery.add(queryExecutionResult.queryId().get());
                // }
            }
        }
        catch(Exception e){
            log.debug(""+e);
        }
        client.close();
        
        String listenerClass = "CustomMessageListener";
        boolean startImmediately = true;
        customKafkaListenerRegistrar.registerCustomKafkaListener(null,
                CustomKafkaListenerProperty.builder()
                        .topic(full_stream_name)
                        .listenerClass(listenerClass)
                        .build(),
                startImmediately);

        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("ws_url", WebSocketConstants.WEBSOCKET_URL);
        jsonObject.addProperty("destination", WebSocketConstants.DESTINATION_PREFIX + full_stream_name);
        jsonObject.addProperty("stream_name", full_stream_name);
        jsonObject.add("terminate_query", terminateQuery);

        return new ResponseEntity<>(jsonObject.toString(), HttpStatus.OK);
    }

    // @PostMapping("/fullStream")
    // ResponseEntity<?> createFullStream(@RequestBody BoundingBox bbox) throws ExecutionException, InterruptedException {
    //     // String full_stream_name = "ALL_STREAM_" + UUID.randomUUID();
    //     String full_stream_name = "ALL_STREAM";

    //     ListTopicsResult result = adminClient.listTopics();
    //     Collection<TopicListing> list = result.listings().get();

    //     ClientOptions options = ClientOptions.create()
    //             .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
    //             .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
    //     Client client = Client.create(options);

    //     String query = "CREATE STREAM " + full_stream_name + " " +
    //                     "(type VARCHAR, " +
    //                     "id DOUBLE, " +
    //                     "geometry STRUCT<type VARCHAR, coordinates ARRAY<DOUBLE>>, " +
    //                     "\"properties\" STRUCT<TIME VARCHAR(STRING), VELOCITY ARRAY<DOUBLE>, CLASS_NAME VARCHAR(STRING)>)" + // need to add properties
    //                     "WITH (KAFKA_TOPIC='" + full_stream_name + "', VALUE_FORMAT='JSON', PARTITIONS=2);";
    //     log.info(query);
    //     ExecuteStatementResult queryExecutionResult = client.executeStatement(query).get();
    //     log.info(queryExecutionResult.toString());

    //     JsonArray terminateQuery = new JsonArray();
    //     for(TopicListing topicListing : list){
    //         log.info(topicListing.name());
    //         // if(topicListing.name().split("_")[0].equals("S")) { // "S"?
    //         if(topicListing.name().split("_")[0].equals("POINT")) {
    //             query = "INSERT INTO " + full_stream_name + " " +
    //                     "SELECT type, id, geometry, \"properties\" FROM " + topicListing.name() + " " +
    //                     "WHERE " + // where coordinate in range // index start with 1 in ksqlDB
    //                     "(geometry->coordinates[1] BETWEEN " + bbox.getMin_x() + " AND " + bbox.getMax_x() + ") " +
    //                     "AND " +
    //                     "(geometry->coordinates[2] BETWEEN " + bbox.getMin_y() + " AND " + bbox.getMax_y() + ") " +
    //                     "EMIT CHANGES;";
    //             log.info(query);
    //             queryExecutionResult = client.executeStatement(query).get();
    //             log.info(queryExecutionResult.toString());
    //             terminateQuery.add(queryExecutionResult.queryId().get());
    //         }
    //     }

    //     client.close();

    //     JsonObject jsonObject = new JsonObject();
    //     jsonObject.addProperty("ws_url", WebSocketConstants.WEBSOCKET_URL);
    //     jsonObject.addProperty("destination", WebSocketConstants.DESTINATION_PREFIX + full_stream_name);
    //     jsonObject.addProperty("destination", WebSocketConstants.DESTINATION_PREFIX + full_stream_name);
    //     jsonObject.add("terminateQuery", terminateQuery);
    //     String listenerClass = "CustomMessageListener";
    //     boolean startImmediately = true;
    //     customKafkaListenerRegistrar.registerCustomKafkaListener(null,
    //             CustomKafkaListenerProperty.builder()
    //                     .topic(full_stream_name)
    //                     .listenerClass(listenerClass)
    //                     .build(),
    //             startImmediately);

    //     return new ResponseEntity<>(jsonObject.toString(), HttpStatus.OK);
    // }

    @GetMapping("/tproperty/{kafka_topic}")
    ResponseEntity<?> kafkaToWebsocket(@PathVariable("kafka_topic") String kafka_topic) {
        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("ws_url", WebSocketConstants.WEBSOCKET_URL);
        jsonObject.addProperty("destination", WebSocketConstants.DESTINATION_PREFIX + kafka_topic);

        String listenerClass = "CustomMessageListener";
        boolean startImmediately = true;
        customKafkaListenerRegistrar.registerCustomKafkaListener(null,
                CustomKafkaListenerProperty.builder()
                        .topic(kafka_topic)
                        .listenerClass(listenerClass)
                        .build(),
                startImmediately);

        return new ResponseEntity<>(jsonObject.toString(), HttpStatus.OK);
    }

    @PostMapping("/ksql/query")
    ResponseEntity<?> sendQuery(@RequestBody RawQuery rq) throws ExecutionException, InterruptedException {
        String query = rq.getQuery();
        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);


        log.info(query); 
        try {
            ExecuteStatementResult result = client.executeStatement(query).get();
            log.info("Successfully executed.");
            client.close();
            return new ResponseEntity<>(result.toString(), HttpStatus.OK);
        } catch (ExecutionException | InterruptedException exception) {
            client.close();
            log.error("Error happened :" + exception);
            return new ResponseEntity<>("Error happened :" + exception, HttpStatus.BAD_REQUEST);
        }



    }

    @GetMapping("/ksql/stream")
    ResponseEntity<?> getStreamList() throws ExecutionException, InterruptedException {
        JsonObject JsonObject = new JsonObject();

        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);

        List<StreamInfo> streams = client.listStreams().get();
        client.close();
        for (StreamInfo stream : streams){
            JsonObject stream_json = new JsonObject();
            stream_json.addProperty("Topic", stream.getTopic()); 
            stream_json.addProperty("KeyFormat", stream.getKeyFormat()); 
            stream_json.addProperty("ValueFormat", stream.getValueFormat()); 
            stream_json.addProperty("isWindowed", stream.isWindowed()); 
            JsonObject.add(stream.getName(), stream_json);
        }
        
        return new ResponseEntity<>(JsonObject.toString(), HttpStatus.OK);
    }

    @GetMapping("/ksql/table")
    ResponseEntity<?> getTableList() throws ExecutionException, InterruptedException {
        JsonObject JsonObject = new JsonObject();

        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);

        List<TableInfo> streams = client.listTables().get();
        client.close();
        for (TableInfo stream : streams){
            JsonObject stream_json = new JsonObject();
            stream_json.addProperty("Topic", stream.getTopic()); 
            stream_json.addProperty("KeyFormat", stream.getKeyFormat()); 
            stream_json.addProperty("ValueFormat", stream.getValueFormat()); 
            stream_json.addProperty("isWindowed", stream.isWindowed()); 
            JsonObject.add(stream.getName(), stream_json);
        }
        
        return new ResponseEntity<>(JsonObject.toString(), HttpStatus.OK);
    }

    @GetMapping("/ksql/describe/{name}")
    ResponseEntity<?> describeSource(@PathVariable("name") String name) throws ExecutionException, InterruptedException {
        JsonObject JsonObject = new JsonObject();

        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);

        SourceDescription description = client.describeSource(name).get();
        client.close();

        JsonObject.addProperty("name", description.name());
        JsonObject.addProperty("keyFormat", description.keyFormat());
        JsonObject.addProperty("sqlStatement", description.sqlStatement());
        JsonObject.addProperty("windowType", description.windowType().toString());
        JsonArray fields = new JsonArray();
        for ( FieldInfo fieldinfo : description.fields()){
            JsonObject field = new JsonObject();
            field.addProperty("name", fieldinfo.name());
            field.addProperty("type", fieldinfo.type().toString());
            fields.add(field);
        }
        JsonObject.add("fields", fields);
        
        return new ResponseEntity<>(JsonObject.toString(), HttpStatus.OK);
    }


    @PostMapping("/ksql/drop/queries")
    ResponseEntity<?> dropStreams(@RequestBody DropQueries dq) throws ExecutionException, InterruptedException {
        List<String> queries = dq.getQueries();
        JsonObject JsonObject = new JsonObject();

        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);

        boolean error = false;
        for(String query : queries){
            log.info("/ksql/drop/queries : " + query);
            try {
                if(query.split("_")[0].equals("TABLE")){
                    client.executeStatement("DROP TABLE " + query.toUpperCase() + ";").get();
                    log.info("DROP TABLE " + query.toUpperCase() + ";");
                    error = false;
                }
                else{
                    client.executeStatement("DROP STREAM " + query.toUpperCase() + ";").get();
                    log.info("DROP STREAM " + query.toUpperCase() + ";");
                    error = false;
                }

            } catch (ExecutionException | InterruptedException exception) {
                error = true;
                log.error("There is no same Stream or Table Exist :" + exception);
            }
        }
        client.close();

        if(error){
            return new ResponseEntity<>("error happened.", HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(queries+" removed.", HttpStatus.OK);
    }

    @PostMapping("/ksql/terminate/queries")
    ResponseEntity<?> terminateQuery(@RequestBody DropQueries dq) throws ExecutionException, InterruptedException {
        JsonObject JsonObject = new JsonObject();

        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);

        List<String> queries = dq.getQueries();
        boolean error = false;
        for(String query : queries){
            try {
                client.executeStatement("TERMINATE " + query.toUpperCase() + ";").get();
                log.info("terminate: "+query);
            } catch (ExecutionException | InterruptedException exception) {
                error = true;
                log.error("There is no same Stream or Table Exist :" + exception);
            }
        }    
        client.close();

        if(error){
            return new ResponseEntity<>("error happened.", HttpStatus.BAD_REQUEST);
        }
        return new ResponseEntity<>(queries+" removed.", HttpStatus.OK);
    }



    @PostMapping("/process/aggregation")
    ResponseEntity<?> continuousQueryWithKSQL(@RequestBody ContinuousQueryParam cq) throws ExecutionException, InterruptedException {
        String streamName = cq.getStream_name();
        int resolution = cq.getResolution();
        String aggregationType = cq.getType();
        int windowSize = cq.getWindow_size();
        int windowStep = cq.getWindow_step();
        String method = cq.getMethod();
        method = (method.equals("GeoHash")) ? "GEOHASH" : "PDCODE";

        ClientOptions options = ClientOptions.create()
                .setHost(KsqlDBConstants.KSQLDB_SERVER_HOST)
                .setPort(KsqlDBConstants.KSQLDB_SERVER_HOST_PORT);
        Client client = Client.create(options);

        String windowedTableName = "TABLE_" + streamName + "_"+method+"_" + resolution;
        String windowedStreamName = "STREAM_" + windowedTableName;
        String aggregationStreamName = "AGG_" + windowedStreamName;

        try {
            client.executeStatement("DROP STREAM " + aggregationStreamName.toUpperCase() + ";").get();
        } catch (ExecutionException | InterruptedException exception) {
            log.error("There is no same Stream or Table Exist :" + exception);
        }

        try {
            client.executeStatement("DROP STREAM " + windowedStreamName.toUpperCase() + ";").get();
        } catch (ExecutionException | InterruptedException exception) {
            log.error("There is no same Stream or Table Exist :" + exception);
        }

        try {
            client.executeStatement("DROP TABLE " + windowedTableName.toUpperCase() + ";").get();
        } catch (ExecutionException | InterruptedException exception) {
            log.error("There is no same Stream or Table Exist :" + exception);
        }

        // TODO: According to aggregation query type, query SQL should different
        String sql_build_table_with_pdcode = "CREATE TABLE " + windowedTableName + " AS "
                // + " SELECT PDCODE(geometry->coordinates[2], geometry->coordinates[1], " + resolution + ") AS ID,"
                + " SELECT "+method+"(geometry->coordinates[2], geometry->coordinates[1], " + resolution + ") AS ID,"
                + " COUNT_DISTINCT(id) AS NUM_OF_FEATURES"
                + " FROM " + streamName
                + " WINDOW TUMBLING (SIZE " + windowSize + " SECONDS) "
                // + " GROUP BY PDCODE(geometry->coordinates[2], geometry->coordinates[1], " + resolution + ")"
                + " GROUP BY "+method+"(geometry->coordinates[2], geometry->coordinates[1], " + resolution + ")"
                + " EMIT CHANGES;";
        log.info(sql_build_table_with_pdcode);
        client.executeStatement(sql_build_table_with_pdcode).get();

        String sql_build_stream_windowed = "CREATE STREAM " + windowedStreamName
                + "(ID VARCHAR KEY, NUM_OF_FEATURES INTEGER) WITH "
                + "(KAFKA_TOPIC='" + windowedTableName + "', VALUE_FORMAT='JSON', "
                + "WINDOW_TYPE='TUMBLING', WINDOW_SIZE='" + windowSize + " SECONDS');";
        log.info(sql_build_stream_windowed);
        client.executeStatement(sql_build_stream_windowed).get();

        String sql_aggregated_stream = "CREATE STREAM " + aggregationStreamName + " WITH (VALUE_FORMAT = 'JSON') AS "
                + " SELECT ID, "
                + " 'Feature' AS TYPE,"
                + " FROM_UNIXTIME(WINDOWEND) AS TIME,"
                // + " PDCODE_BOUNDARY(ID) AS GEOMETRY,"
                + " "+method+"_BOUNDARY(ID) AS GEOMETRY,"
                + " MAP('COUNT' := NUM_OF_FEATURES) AS \"PROPERTIES\""
                + " FROM " + windowedStreamName
                + " EMIT CHANGES;";
        log.info(sql_aggregated_stream);
        client.executeStatement(sql_aggregated_stream).get();
        client.close();

        String listenerClass = "CustomMessageListener";
        boolean startImmediately = true;
        customKafkaListenerRegistrar.registerCustomKafkaListener(null,
                CustomKafkaListenerProperty.builder()
                        .topic(aggregationStreamName.toUpperCase())
                        .listenerClass(listenerClass)
                        .build(),
                startImmediately);

        JsonObject jsonObject = new JsonObject();
        jsonObject.addProperty("ws_url", WebSocketConstants.WEBSOCKET_URL);
        jsonObject.addProperty("destination", WebSocketConstants.DESTINATION_PREFIX + aggregationStreamName.toUpperCase());
        
        JsonArray stream_names = new JsonArray();
        stream_names.add(aggregationStreamName);
        stream_names.add(windowedStreamName);
        stream_names.add(windowedTableName);
        jsonObject.add("stream_names", stream_names);

        return new ResponseEntity<>(jsonObject.toString(), HttpStatus.OK);
    }
}
