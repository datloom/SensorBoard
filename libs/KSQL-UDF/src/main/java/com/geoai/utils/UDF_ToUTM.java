package com.geoai.utils;

import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import io.confluent.ksql.function.udf.Udf;

import org.locationtech.proj4j.*;

import java.util.ArrayList;
import java.util.List;

/**
 * <b>UDF Class</b><br>
 * To generate the UTM coordinates<br>
 * <b>Usage in KSQLDB</b> : UTM(double latitude, double longitude) 
 */
@UdfDescription(name = "UTM",
                author = "taehoon.kim",
                version = "0.0.1",
                description = "A custom function for the PD code")
public class UDF_ToUTM {

    /** 
     * Return UTM coordinates according to latitude and longitude
     * 
     * @param   latitude    Latitude from WGS84 (UoM: degree)
     * @param   longitude   Longitude from WGS84 (UoM: degree)
     * @return              Return UTM coordinates according to latitude and longitude, with zone code
     */
    @Udf(description = "geodetic coordinates decoding to UTM coordinates.")
    public List<Double> to_UTMCoordinate(@UdfParameter double latitude, @UdfParameter double longitude) {
        int zone = (int) ((longitude + 180) / 6.0 + 1);
        CRSFactory crsFactory = new CRSFactory();
        CoordinateReferenceSystem WGS84 = crsFactory.createFromName("epsg:4326");
        CoordinateReferenceSystem UTM = crsFactory.createFromParameters("UTM", String.format("+proj=utm +zone=%d +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs", zone));
        CoordinateTransformFactory ctFactory = new CoordinateTransformFactory();
        CoordinateTransform wgsToUtm = ctFactory.createTransform(WGS84, UTM);
        ProjCoordinate resultCoord = new ProjCoordinate();
        wgsToUtm.transform(new ProjCoordinate(longitude, latitude), resultCoord);

        List<Double> result = new ArrayList<>();
        result.add(resultCoord.x);
        result.add(resultCoord.y);
        result.add((double) zone);

        return result;
    }
}
