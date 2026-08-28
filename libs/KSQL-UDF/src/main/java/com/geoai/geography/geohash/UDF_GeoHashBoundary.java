package com.geoai.geography.geohash;

import ch.hsr.geohash.*;

import io.confluent.ksql.function.udf.Udf;
import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * <b>UDF Class</b><br>
 * To generate the boundary coordinates of PD code<br>
 * <b>Usage in KSQLDB</b> : PDCODE_BOUNDARY(string pdcode)
 */
@UdfDescription(name = "GEOHASH_BOUNDARY",
        author = "taehoon.kim",
        version = "0.0.1",
        description = "A util function (getBoundary) for the geohash code")
public class UDF_GeoHashBoundary {

    /**
     * Return the boundary geometry of PD code as GeoJSON POLYGON
     *
     * @param   geohashcode    PD code: Point cloud DGGS code, DGGS Morton for point cloud
     * @return            Return the boundary geometry of PD code as GeoJSON POLYGON
     */
    @Udf(description = "GeoHash boundary.")
    public String getPDCodeBoundary(@UdfParameter String strGeoHash) {
        GeoHash geoHash = GeoHash.fromGeohashString(strGeoHash);
        BoundingBox box = geoHash.getBoundingBox();
        WGS84Point southeast = box.getSouthEastCorner();
        WGS84Point northeast = box.getNorthEastCorner();
        WGS84Point northwest = box.getNorthWestCorner();
        WGS84Point southwest = box.getSouthWestCorner();

        String geojson = "{\"coordinates\" : [["
            +"["+Double.toString(southeast.getLongitude())+", "+Double.toString(southeast.getLatitude())+"],"
            +"["+Double.toString(northeast.getLongitude())+", "+Double.toString(northeast.getLatitude())+"],"
            +"["+Double.toString(northwest.getLongitude())+", "+Double.toString(northwest.getLatitude())+"],"
            +"["+Double.toString(southwest.getLongitude())+", "+Double.toString(southwest.getLatitude())+"],"
            +"["+Double.toString(southeast.getLongitude())+", "+Double.toString(southeast.getLatitude())+"]"
            +"]], \"type\" : \"Polygon\"}";
        
        return geojson;
    }


}
