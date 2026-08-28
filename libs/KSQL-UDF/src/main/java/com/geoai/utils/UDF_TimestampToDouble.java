package com.geoai.utils;

import java.sql.Timestamp;

import io.confluent.ksql.function.udf.Udf;
import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;


/**
 * <b>UDF class</b><br>
 * To cast type timestamp to double <br>
 * <b>Usage in KSQLDB</b> : TIMESTAMP_TO_DOUBLE({timestamp})
 */
@UdfDescription(name = "TIMESTAMP_TO_DOUBLE", description = "timestamp to nano sec")
public class UDF_TimestampToDouble {

    /**
     * Return double type of input timestamp
     * @param timestamp timestamp
     * @return timestamp value
     */
    @Udf(description = "timestamp to nano sec")
    public double timestamp_to_double(@UdfParameter(value = "timestamp") final Timestamp timestamp) {
        return timestamp.getTime();
        
    }

}