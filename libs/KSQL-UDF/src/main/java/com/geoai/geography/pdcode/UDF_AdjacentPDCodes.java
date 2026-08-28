package com.geoai.geography.pdcode;

import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import io.confluent.ksql.function.udf.Udf;

import java.util.ArrayList;
import java.util.List;

import jp.go.aist.dggs.geometry.ISEA4DFaceCoordinates;
import jp.go.aist.dggs.geometry.Morton3D;
import jp.go.aist.dggs.utils.MortonUtils;

import org.giscience.utils.geogrid.geometry.GeoCoordinates;

/**
 * <b>UDF Class</b><br>
 * To create neighbor PD codes according to hop<br>
 * <b>Usage in KSQLDB</b> : ADJACENT_PDCODES(double latitude, double longitude, int resolution, int hop) 
 */
@UdfDescription(name = "ADJACENT_PDCODES",
        description = "A custom function for the PD codes array")
public class UDF_AdjacentPDCodes {

    /** 
     * Return a list of neighbor PD codes according to hop
     * 
     * @param   latitude    Latitude from WGS84 (UoM: degree)
     * @param   longitude   Longitude from WGS84 (UoM: degree)
     * @param   resolution  Resolution of generate face coordinates
     * @param   hop         Hop of generate neighbor PD codes, Range is from 0 to 5
     * @return              Return a list of neighbor PD codes according to hop
     */
    @Udf(description = "Peripheral PD codes list (Point cloud DGGS code, DGGS Morton for point cloud) according to hop")
    public static List<String> adjacentPdcodes(@UdfParameter double latitude,
                                               @UdfParameter double longitude,
                                               @UdfParameter int resolution,
                                               @UdfParameter int hop)
    {
        List<String> result = new ArrayList<>();

        GeoCoordinates geoCoordinates = new GeoCoordinates(latitude, longitude, 0d);
        ISEA4DFaceCoordinates faceCoordinates = MortonUtils.toFaceCoordinate(geoCoordinates);
        String pdCode = Morton3D.encode(faceCoordinates, resolution);
        ISEA4DFaceCoordinates isea4DFaceCoordinates = Morton3D.decode(pdCode, resolution);

        if(hop < 0) hop = 0;
        else if(hop > 5) hop = 5;

        int face = isea4DFaceCoordinates.getFace();
        long init_x = Math.max(isea4DFaceCoordinates.getX() - hop, 0);
        long last_x = Math.min(isea4DFaceCoordinates.getX() + hop, isea4DFaceCoordinates.getMaxX());
        long init_y = Math.max(isea4DFaceCoordinates.getY() - hop, 0);
        long last_y = Math.min(isea4DFaceCoordinates.getY() + hop, isea4DFaceCoordinates.getMaxY());
        long z = isea4DFaceCoordinates.getZ();

        for(long x = init_x; x <= last_x; x++) {
            for(long y = init_y; y <= last_y; y++) {
                ISEA4DFaceCoordinates new_ISEA4DFaceCoordinates = new ISEA4DFaceCoordinates(face, x, y, z, resolution);
                String candidatePdCode = Morton3D.encode(new_ISEA4DFaceCoordinates, resolution);
                result.add(candidatePdCode);
            }
        }
        return result;
            
    }
}
