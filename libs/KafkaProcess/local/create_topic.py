from confluent_kafka.admin import AdminClient, NewTopic

admin = AdminClient({"bootstrap.servers": "localhost:9092"})
topic = NewTopic("TEST_20260827", num_partitions=8, replication_factor=1)

fs = admin.create_topics([topic])
for topic_name, f in fs.items():
    try:
        f.result()  # 성공하면 None 반환
        print(f"Completed to create Topic: {topic_name}")
    except Exception as e:
        print(f"Failed to create Topic {topic_name}: {e}")