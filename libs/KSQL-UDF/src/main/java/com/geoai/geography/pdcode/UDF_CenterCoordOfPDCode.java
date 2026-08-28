package com.geoai.geography.pdcode;

import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import io.confluent.ksql.function.udf.Udf;

import jp.go.aist.dggs.geometry.ISEA4DFaceCoordinates;
import jp.go.aist.dggs.geometry.MeterFaceCoordinates;
import jp.go.aist.dggs.geometry.Morton3D;
import jp.go.aist.dggs.utils.MortonUtils;

import org.giscience.utils.geogrid.geometry.GeoCoordinates;

import java.util.ArrayList;
import java.util.List;

/**
 * <b>UDF Class</b><br>
 * To generate the center coordinates of PD code<br>
 * <b>Usage in KSQLDB</b> : CENTER_COORD_OF_PDCODE(double latitude, double longitude, int resolution) 
 */
@UdfDescription(name = "CENTER_COORD_OF_PDCODE",
        description = "A decoding function for the center coordinate of PD code")
public class UDF_CenterCoordOfPDCode {

    /** 
     * Return the center coordinates of PD code
     * 
     * @param   latitude    Latitude from WGS84 (UoM: degree)
     * @param   longitude   Longitude from WGS84 (UoM: degree)
     * @param   resolution  Resolution of generate face coordinates
     * @return              Return the center coordinates of PD code by decoding to geographic coordinates (WGS 84, EPSG:4326)
     */
    @Udf(description = "The center coordinate of PD code (Point cloud DGGS code, DGGS Morton for point cloud)")
    public static List<Double> centerCoordOfPdcode(@UdfParameter double latitude,
                                                   @UdfParameter double longitude,
                                                   @UdfParameter int resolution){
        List<Double> result = new ArrayList<>();
        String pdcode = MortonUtils.toPDCode(latitude, longitude, resolution);
        GeoCoordinates geoCoordinates = Morton3D.getCenter(pdcode);
        Double lat = geoCoordinates.getLat();
        Double lon = geoCoordinates.getLon();
        result.add(lat);
        result.add(lon);
        return result;
    }

    /** 
     * Return the center coordinates of PD code
     * 
     * @param   pdcode    PD code: Point cloud DGGS code, DGGS Morton for point cloud
     * @return            Return the center coordinates of PD code by decoding to geographic coordinates (WGS 84, EPSG:4326)
     */
    @Udf(description = "PD code (Point cloud DGGS code, DGGS Morton for point cloud) decoding to geographic coordinates (WGS 84, EPSG:4326)")
    public List<Double> centerCoordOfPdcode(@UdfParameter String pdcode) {
        List<Double> result = new ArrayList<>();
        GeoCoordinates geoCoordinates = MortonUtils.toGeoCoordinate(pdcode);

        result.add(geoCoordinates.getLat());
        result.add(geoCoordinates.getLon());

        return result;
    }

    /** 
     * Return the center coordinates of PD code
     * 
     * @param   pdcode      PD code: Point cloud DGGS code, DGGS Morton for point cloud
     * @param   resolution  Resolution of generate face coordinates
     * @return              Return the center coordinates of PD code by decoding to meter coordinates
     */
    @Udf(description = "PD code (Point cloud DGGS code, DGGS Morton for point cloud) decoding to meter coordinates")
    public List<Double> centerCoordOfPdcode(@UdfParameter String pdcode,
                                            @UdfParameter int resolution) {
        List<Double> result = new ArrayList<>();
        ISEA4DFaceCoordinates isea4DFaceCoordinates = MortonUtils.toFaceCoordinate(MortonUtils.toGeoCoordinate(pdcode, resolution));
        MeterFaceCoordinates meterFaceCoordinates = isea4DFaceCoordinates.toMeterUnit();
        result.add((double) meterFaceCoordinates.getX());
        result.add((double) meterFaceCoordinates.getY());

        return result;
    }
}
