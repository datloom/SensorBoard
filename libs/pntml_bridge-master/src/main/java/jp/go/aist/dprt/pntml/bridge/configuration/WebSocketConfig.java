package jp.go.aist.dprt.pntml.bridge.configuration;

import lombok.extern.java.Log;
import org.springframework.stereotype.Component;

import javax.websocket.*;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Log
@Component
@ServerEndpoint(value = "/ws2")
public class WebSocketConfig {
    private Session session;
    public static Set<WebSocketConfig> listeners = new CopyOnWriteArraySet<>();
    private static int onlineCount = 0;

    @OnOpen
    public void onOpen(Session session) {
        onlineCount++;
        this.session = session;
        listeners.add(this);
        log.info("onOpen called, userCount:" + onlineCount);
    }

    @OnClose
    public void onClose(Session session) {
        onlineCount--;
        listeners.remove(this);
        log.info("onClose called, userCount:" + onlineCount);
    }

    @OnMessage
    public void onMessage(String message) {
        log.info("onMessage called, message:" + message);
        broadcast(message);
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        log.warning("onClose called, error:" + throwable.getMessage());
        listeners.remove(this);
        onlineCount--;
    }

    public static void broadcast(String message) {
        for (WebSocketConfig listener : listeners) {
            listener.sendMessage(message);
        }
    }

    private void sendMessage(String message) {
        try {
            this.session.getBasicRemote().sendText(message);
        } catch (IOException e) {
            log.warning("Caught exception while sending message to Session " + this.session.getId() + "error:" + e.getMessage());
        }
    }
}
