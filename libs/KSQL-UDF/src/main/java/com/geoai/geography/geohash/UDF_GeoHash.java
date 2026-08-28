package com.geoai.geography.geohash;

import ch.hsr.geohash.*;

import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import io.confluent.ksql.function.udf.Udf;

import java.util.List;

/**
 * <b>UDF Class</b><br>
 * To generate the GeoHash<br>
 * <b>Usage in KSQLDB</b> : GEOHASH(double latitude, double longitude, int resolution) 
 */
@UdfDescription(name = "GEOHASH", description = "A custom function for GeoHash")
public class UDF_GeoHash{

    /** 
     * Return the GeoHash according to latitude, longitude and resolution
     * 
     * @param   latitude    Latitude from WGS84 (UoM: degree)
     * @param   longitude   Longitude from WGS84 (UoM: degree)
     * @param   resolution  Length of GeoHash, The hash can only be 64bits long, thus a maximum precision of 12 characters can be achieved.
     * @return              Return the GeoHash according to latitude, longitude and resolution
     */
    @Udf(description = "GeoHash encoding from 2-D coordinates.")
    public String to_GeoHash(@UdfParameter double latitude,
                             @UdfParameter double longitude,
                             @UdfParameter int resolution)    {
        GeoHash geoHash = GeoHash.withCharacterPrecision(latitude, longitude, resolution);
        return geoHash.toBase32();
    }

    /** 
     * Return the GeoHash according to coordinates and resolution
     * 
     * @param   coordinates List of Latitude and longitude from WGS84 (UoM: degree)
     * @param   resolution  Length of GeoHash, The hash can only be 64bits long, thus a maximum precision of 12 characters can be achieved.
     * @return              Return the GeoHash according to coordinates and resolution
     */
    @Udf(description = "GeoHash encoding from 2-D coordinates.")
    public String to_GeoHash(@UdfParameter List<Double> coordinates,
                             @UdfParameter int resolution) {
        double latitude     = coordinates.get(1);
        double longitude    = coordinates.get(2);
        GeoHash geoHash     = GeoHash.withCharacterPrecision(latitude, longitude, resolution);
        return geoHash.toBase32();
    }
}
