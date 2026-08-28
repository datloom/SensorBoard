package jp.go.aist.dprt.pntml.bridge.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DropQueries {
    private List<String> queries;
}
