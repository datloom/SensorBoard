package jp.go.aist.dprt.pntml.bridge.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContinuousQueryParam {
    private String stream_name;
    private String method;
    private Integer resolution;
    private String type; // ENUM ( One of SUM, AVG, MIN, MAX, COUNT )
    private Integer window_size;
    private Integer window_step;
}
