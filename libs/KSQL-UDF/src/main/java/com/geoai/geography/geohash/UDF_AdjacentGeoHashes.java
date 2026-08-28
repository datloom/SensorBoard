package com.geoai.geography.geohash;

import ch.hsr.geohash.*;

import io.confluent.ksql.function.udf.UdfDescription;
import io.confluent.ksql.function.udf.UdfParameter;
import io.confluent.ksql.function.udf.Udf;

import java.util.ArrayList;
import java.util.List;

/**
 * <b>UDF Class</b><br>
 * To create peripheral GeoHashes according to hop<br>
 * <b>Usage in KSQLDB</b> : ADJACENT_GEOHASHES(double latitude, double longitude, int resolution, int hop) 
 */
@UdfDescription(name = "ADJACENT_GEOHASHES", description = "A custom function for the GeoHashes array")
public class UDF_AdjacentGeoHashes{

    /** 
     * Return a list of peripheral GeoHashes according to hop
     * 
     * @param   latitude    Latitude from WGS84 (UoM: degree)
     * @param   longitude   Longitude from WGS84 (UoM: degree)
     * @param   resolution  Length of GeoHash, The hash can only be 64bits long, thus a maximum precision of 12 characters can be achieved.
     * @param   hop         Hop of generate pheripheral GeoHashes, Range is from 0 to 5
     * @return              Return a list of peripheral GeoHashes according to hop
     */
    @Udf(description = "Peripheral GeoHashes list")
    public static List<String> adjacentGeoHashes(@UdfParameter double latitude,
                                                    @UdfParameter double longitude,
                                                    @UdfParameter int resolution,
                                                    @UdfParameter int hop)
    {
        if(hop>resolution) throw new Error("Resolution must be equal or upper than hop");
        if(hop < 0) hop = 0;
        else if(hop > 5) hop = 5;

        List<String> output = new ArrayList<>();
        List<GeoHash> geoHashList = new ArrayList<>();
        GeoHash geoHash = GeoHash.withCharacterPrecision(latitude, longitude, resolution);
        geoHashList.add(geoHash);

        // spread to left, right side
        for(int i=0; i<hop; i++){
            geoHashList.add(0, geoHashList.get(0).getWesternNeighbour());
            geoHashList.add(geoHashList.get(geoHashList.size()-1).getEasternNeighbour());
        }

        // spread to down, up side
        int size = geoHashList.size();
        for(int i=0; i<hop; i++){
            for(int k=0; k<size; k++){
                geoHashList.add(0,geoHashList.get(size-1).getSouthernNeighbour());
                geoHashList.add(geoHashList.get(geoHashList.size()-size).getNorthernNeighbour());
            }
        }

        for(GeoHash iter : geoHashList){
            output.add(iter.toBase32());
        }
        
        return output;
    }
}
