# ksqlDB + Kafka 테스트 환경

Zookeeper 없이 Kafka KRaft 모드로 구성한 단일 브로커 테스트 환경입니다.

## 구성 요소

| 서비스 | 포트 | 설명 |
|---|---|---|
| kafka | 9092 (호스트) | Kafka 브로커 (KRaft, replication factor 1) |
| kafka-ui | 8080 | 토픽/메시지 확인용 웹 UI (선택) |
| ksqldb-server | 8088 | ksqlDB REST API 서버 |
| ksqldb-cli | - | ksqlDB CLI 접속용 컨테이너 |

## 실행

```bash
docker compose up -d
docker compose ps          # 헬스체크 상태 확인 (healthy 될 때까지 대기)
```

## ksqlDB CLI 접속

```bash
docker compose exec ksqldb-cli ksql http://ksqldb-server:8088
```

## 간단한 테스트 예제

ksqlDB CLI 안에서:

```sql
-- 토픽 확인
SHOW TOPICS;

-- 스트림 생성 (토픽이 없으면 자동 생성됨)
CREATE STREAM test_stream (id INT, message VARCHAR)
  WITH (KAFKA_TOPIC='test_topic', VALUE_FORMAT='JSON', PARTITIONS=1);

-- 데이터 삽입
INSERT INTO test_stream (id, message) VALUES (1, 'hello ksqldb');

-- 조회 (Ctrl+C로 종료)
SET 'auto.offset.reset' = 'earliest';
SELECT * FROM test_stream EMIT CHANGES;
```

호스트에서 직접 Kafka 콘솔 프로듀서/컨슈머로 확인하고 싶다면:

```bash
docker compose exec kafka kafka-console-producer --bootstrap-server kafka:29092 --topic test_topic
docker compose exec kafka kafka-console-consumer --bootstrap-server kafka:29092 --topic test_topic --from-beginning
```

Kafka UI는 브라우저에서 http://localhost:8080 으로 접속하면 토픽/메시지를 확인할 수 있습니다.

## 종료 및 초기화

```bash
docker compose down          # 컨테이너만 제거
docker compose down -v       # 볼륨까지 제거 (데이터 초기화)
```

## 참고

- `confluentinc/cp-*:7.7.1` 이미지를 사용합니다. 다른 버전이 필요하면 태그를 변경하세요.
- 단일 브로커 환경이므로 모든 replication factor를 1로 고정했습니다. 다중 브로커 클러스터 테스트가 필요하면 별도 요청 주세요.
- `kafka-ui`는 선택 사항이며, 필요 없으면 `docker-compose.yml`에서 해당 서비스 블록만 삭제하면 됩니다.
