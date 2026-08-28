package com.geoai.geography.geohash;

import ch.hsr.geohash.*;

import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import io.confluent.ksql.function.udf.Udf;

import java.util.ArrayList;
import java.util.List;

/**
 * <b>UDF Class</b><br>
 * To generate the center coordinates of GeoHash<br>
 * <b>Usage in KSQLDB</b> : CENTER_COORD_OF_GEOHASH(double latitude, double longitude, int resolution) 
 */
@UdfDescription(name = "CENTER_COORD_OF_GEOHASH", description = "A custom function for the center coordinate of GeoHash")
public class UDF_CenterCoordOfGeoHash {

    /** 
     * Return the center coordinates of GeoHash
     * 
     * @param   latitude    Latitude from WGS84 (UoM: degree)
     * @param   longitude   Longitude from WGS84 (UoM: degree)
     * @param   resolution  Length of GeoHash, The hash can only be 64bits long, thus a maximum precision of 12 characters can be achieved.
     * @return              Return the center coordinates of GeoHash
     */
    @Udf(description = "The center coordinate of GeoHash")
    public List<Double> centerCoord_ofGeoHash(@UdfParameter double latitude,
                                              @UdfParameter double longitude,
                                              @UdfParameter int resolution){
        List<Double> result = new ArrayList<>();
        GeoHash geoHash = GeoHash.withCharacterPrecision(latitude, longitude, resolution);
        WGS84Point wgs84Point = geoHash.getBoundingBoxCenter();
        result.add(wgs84Point.getLatitude());
        result.add(wgs84Point.getLongitude());
        return result;
    }

    /** 
     * Return the center coordinates of GeoHash
     * 
     * @param   strGeoHash  GeoHash from a base32-encoded String.
     * @return              Return the center coordinates of GeoHash
     */
    @Udf(description = "The center coordinate of GeoHash")
    public List<Double> centerCoord_ofGeoHash(@UdfParameter String strGeoHash) {
        List<Double> result = new ArrayList<>();
        GeoHash geoHash = GeoHash.fromGeohashString(strGeoHash);
        WGS84Point wgs84Point = geoHash.getBoundingBoxCenter();
        result.add(wgs84Point.getLatitude());
        result.add(wgs84Point.getLongitude());

        return result;
    }
}
