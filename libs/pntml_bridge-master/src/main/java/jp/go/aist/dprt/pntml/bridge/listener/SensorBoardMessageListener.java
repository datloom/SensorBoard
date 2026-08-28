package jp.go.aist.dprt.pntml.bridge.listener;

import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.config.KafkaListenerEndpoint;
import org.springframework.kafka.config.MethodKafkaListenerEndpoint;
import org.springframework.kafka.listener.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class SensorBoardMessageListener extends CustomMessageListener {

    @Autowired
    SimpMessagingTemplate template;

    @Override
    @SneakyThrows
    public KafkaListenerEndpoint createKafkaListenerEndpoint(String name, String topic) {
        MethodKafkaListenerEndpoint<String, String> kafkaListenerEndpoint =
                createDefaultMethodKafkaListenerEndpoint(name, topic);
        kafkaListenerEndpoint.setBean(new MyMessageListener(template));
        kafkaListenerEndpoint.setMethod(MyMessageListener.class.getMethod("onMessage", ConsumerRecord.class));
        return kafkaListenerEndpoint;
    }

    @Slf4j
    private static class MyMessageListener implements MessageListener<String, String> {
        SimpMessagingTemplate stomp_template;

        public MyMessageListener(SimpMessagingTemplate template) {
            stomp_template = template;
        }

        @Override
        public void onMessage(ConsumerRecord<String, String> record) {
//            log.info("My message listener got a new record: " + record);
            stomp_template.convertAndSend("/topic/" + record.topic(), record.value());
        }
    }
}
