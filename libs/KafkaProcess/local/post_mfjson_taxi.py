import os, sys
import json
import pickle
import time
from loguru import logger
from pyhocon import ConfigFactory

from confluent_kafka import Producer, KafkaException
from confluent_kafka.admin import AdminClient, NewTopic

curr_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(curr_dir)
conf = ConfigFactory.parse_file(f"{parent_dir}/config/Kafka.hocon")


class TrackerRobotPublisher:

    def __init__(self, params):

        if len(params) > 1:
            self.kafka_topic = params[0]
        else:
            self.kafka_topic = conf.kafka.target_topic
        self.waiting_time = conf.kafka.waiting_time
        self.bootstrap_server = conf.kafka.bootstrap_server
        self.target_file = f"{parent_dir}/{conf.data.folder_name}/{conf.data.file_name}"
        self.ensure_topic_exists()
        self.producer = Producer({
            "bootstrap.servers": self.bootstrap_server,
        })

    def ensure_topic_exists(self, num_partitions: int = 8):
        admin = AdminClient({"bootstrap.servers": self.bootstrap_server})

        metadata = admin.list_topics(timeout=10)
        if self.kafka_topic in metadata.topics:
            logger.info(f"The Topic: '<{self.kafka_topic}>' already exists")
            return

        new_topic = NewTopic(
            self.kafka_topic,
            num_partitions=num_partitions,
        )

        fs = admin.create_topics([new_topic])

        for t, f in fs.items():
            try:
                f.result()
                logger.info(f"The Topic '<{t}>' generation complete")
            except KafkaException as e:

                logger.error(f"The Topic '<{t}>' creation failed: {e}")

    def _delivery_report(self, err, msg):

        if err is not None:
            logger.error(f"[ERROR] Failed to send: {err}")
        else:
            logger.info(f"[SENT] topic={msg.topic()} value={msg.value()} partition={msg.partition()} offset={msg.offset()}")

    def listener(self):

        with open(self.target_file, "rb") as f:
            feature_collections = pickle.load(f)

        for feature_collection in feature_collections:
            time.sleep(self.waiting_time)
            payload = json.dumps(feature_collection).encode("utf-8")

            self.producer.produce(
                topic=self.kafka_topic,
                value=payload,
                callback=self._delivery_report,
            )
            self.producer.poll(0)

        self.producer.flush()

if __name__ == "__main__":
    args = sys.argv
    node = TrackerRobotPublisher(args)
    node.listener()
