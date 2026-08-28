package com.geoai.geography.pdcode;

import io.confluent.ksql.function.udf.Udf;
import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import jp.go.aist.dggs.geometry.Morton3D;
import jp.go.aist.dggs.query.ISEA4DCellBoundary;
import org.giscience.utils.geogrid.geometry.GeoCoordinates;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * <b>UDF Class</b><br>
 * To generate the boundary coordinates of PD code<br>
 * <b>Usage in KSQLDB</b> : PDCODE_BOUNDARY(string pdcode)
 */
@UdfDescription(name = "PDCODE_BOUNDARY",
        author = "taehoon.kim",
        version = "0.0.1",
        description = "A util function (getBoundary) for the PD code")
public class UDF_PDCodeBoundary {

    /**
     * Return the boundary geometry of PD code as GeoJSON POLYGON
     *
     * @param   pdcode    PD code: Point cloud DGGS code, DGGS Morton for point cloud
     * @return            Return the boundary geometry of PD code as GeoJSON POLYGON
     */
    @Udf(description = "Get the boundary geometry of PD code (Point cloud DGGS code, DGGS Morton for point cloud)")
    public String getPDCodeBoundary(@UdfParameter String pdcode) {
        return Morton3D.getBoundaryGeoJSON(pdcode).toString();
    }


}
