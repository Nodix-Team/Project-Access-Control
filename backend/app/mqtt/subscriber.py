# Subscribe topic controller & routing on_message -> handler yang sesuai (handlers.py),
# berdasar device_id yang diparse dari topic "access/{device_id}/<suffix>".
import logging

from app.mqtt import handlers

logger = logging.getLogger(__name__)

TOPICS = [
    "access/+/logs",
    "access/+/status",
    "access/+/status/lwt",
    "access/+/sync/result",
    "access/+/config/response",
]

_HANDLERS = {
    "logs": handlers.handle_log,
    "status": handlers.handle_status,
    "status/lwt": handlers.handle_lwt,
    "sync/result": handlers.handle_sync_result,
    "config/response": handlers.handle_config_response,
}


def subscribe_all(client) -> None:
    for topic in TOPICS:
        client.subscribe(topic, qos=1)
    logger.info("Subscribe %d topic (QoS 1): %s", len(TOPICS), ", ".join(TOPICS))


def on_message(client, userdata, msg) -> None:
    # topic: access/{device_id}/<suffix> - device_id tidak pernah mengandung "/"
    parts = msg.topic.split("/", 2)
    if len(parts) != 3 or parts[0] != "access":
        logger.warning("Topic tidak dikenal: %s", msg.topic)
        return

    device_id, suffix = parts[1], parts[2]
    handler = _HANDLERS.get(suffix)
    if handler is None:
        logger.warning("Tidak ada handler untuk topic %s", msg.topic)
        return

    payload = msg.payload.decode("utf-8", errors="replace")
    try:
        handler(device_id, payload)
    except Exception:
        logger.exception("Gagal proses %s dari %s: %r", suffix, device_id, payload)
