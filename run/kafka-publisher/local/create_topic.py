from pathlib import Path
from confluent_kafka import KafkaException
from confluent_kafka.admin import AdminClient, NewTopic
from loguru import logger
from pyhocon import ConfigFactory


# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "config" / "Kafka.hocon"

# Load configuration
conf = ConfigFactory.parse_file(str(CONFIG_PATH))


def create_kafka_topic() -> None:
    bootstrap_server = conf.kafka.bootstrap_server
    kafka_topic = conf.kafka.target_topic
    num_partitions = 8

    logger.info(f"Kafka bootstrap server: {bootstrap_server}")
    logger.info(f"Target topic: {kafka_topic}")

    admin = AdminClient({
        "bootstrap.servers": bootstrap_server
    })

    try:
        metadata = admin.list_topics(timeout=10)
    except KafkaException as e:
        logger.error(f"Failed to connect to Kafka: {e}")
        return

    if kafka_topic in metadata.topics:
        logger.info(f"The topic '<{kafka_topic}>' already exists")
        return

    new_topic = NewTopic(
        topic=kafka_topic,
        num_partitions=num_partitions,
    )

    futures = admin.create_topics([new_topic])

    for topic, future in futures.items():
        try:
            future.result()
            logger.info(
                f"The topic '<{topic}>' was created successfully "
                f"with {num_partitions} partitions"
            )
        except KafkaException as e:
            logger.error(
                f"Failed to create the topic '<{topic}>': {e}"
            )


def main() -> None:
    create_kafka_topic()


if __name__ == "__main__":
    main()