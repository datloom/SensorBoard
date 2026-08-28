package jp.go.aist.dprt.pntml.bridge.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RawQuery {
    private String query;
}
