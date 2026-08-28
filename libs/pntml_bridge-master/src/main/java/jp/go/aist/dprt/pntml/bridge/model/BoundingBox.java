package jp.go.aist.dprt.pntml.bridge.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BoundingBox {
    private Float min_x;
    private Float min_y;
    private Float max_x;
    private Float max_y;
}
