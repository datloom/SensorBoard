package jp.go.aist.dprt.pntml.bridge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

@EnableKafka
@SpringBootApplication
@ConfigurationPropertiesScan
public class PntmlBridgeApplication {

    @Bean
    public ServerEndpointExporter serverEndpointExporter() {
        return new ServerEndpointExporter();
    }

    public static void main(String[] args) {
        SpringApplication.run(PntmlBridgeApplication.class, args);
    }

}
