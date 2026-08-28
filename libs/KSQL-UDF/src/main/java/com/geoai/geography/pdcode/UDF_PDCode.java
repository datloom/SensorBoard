package com.geoai.geography.pdcode;

import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import io.confluent.ksql.function.udf.Udf;

import jp.go.aist.dggs.utils.MortonUtils;

import java.util.List;


/**
 * <b>UDF Class</b><br>
 * To generate the PD code<br>
 * <b>Usage in KSQLDB</b> : PDCODE(double latitude, double longitude, int resolution) 
 */
@UdfDescription(name = "PDCODE",
                author = "taehoon.kim",
                version = "0.0.1",
                description = "A encoding function for the PD code")
public class UDF_PDCode {

    /** 
     * Return a PD code according to latitude, longitude and resolution
     * 
     * @param   latitude    Latitude from WGS84 (UoM: degree)
     * @param   longitude   Longitude from WGS84 (UoM: degree)
     * @param   resolution  Resolution of generate face coordinates
     * @return              Return a PD code according to latitude, longitude and resolution
     */
    @Udf(description = "PD code (DGGS Morton for point cloud) encoding from 2-D (or 3-D) geodetic coordinates.")
    public String to_pdcode(@UdfParameter double latitude,
                            @UdfParameter double longitude,
                            @UdfParameter int resolution) {
//        String result = Double.toString(latitude) + " / " + Double.toString(longitude) + " / " + Integer.toString(resolution);
        return MortonUtils.toPDCode(latitude, longitude, resolution);
    }

    /** 
     * Return a PD code according to coordinates and resolution
     * 
     * @param   coordinates List of Latitude and longitude from WGS84 (UoM: degree)
     * @param   resolution  Resolution of generated face coordinates
     * @return              Return a PD code according to coordinates and resolution
     */
    @Udf(description = "PD code (DGGS Morton for point cloud) encoding from 2-D (or 3-D) geodetic coordinates.")
    public String to_pdcode(@UdfParameter List<Double> coordinates,
                            @UdfParameter int resolution) {
        double latitude = coordinates.get(1);
        double longitude = coordinates.get(2);
        // String result = latitude + " / " + longitude + " / " + resolution;
        return MortonUtils.toPDCode(latitude, longitude, resolution);
    }
}