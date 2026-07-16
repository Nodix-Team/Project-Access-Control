# Lifecycle koneksi MQTT (paho) ke EMQX broker — HANYA connect/reconnect/disconnect di sini.
# Subscribe & publish ada di modul mqtt/ lain yang memakai singleton `client` ini.
# App tetap SYNC (PyMySQL) - paho jalan di thread background sendiri (loop_start), bukan asyncio.
import logging

import paho.mqtt.client as mqtt

from app.config import settings
from app.mqtt import subscriber

logger = logging.getLogger(__name__)

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="backend")
client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
client.reconnect_delay_set(min_delay=1, max_delay=30)
client.on_message = subscriber.on_message

_connected = False


def _on_connect(client, userdata, flags, reason_code, properties=None):
    global _connected
    _connected = reason_code == 0
    if _connected:
        logger.info("MQTT terhubung ke %s:%s", settings.MQTT_HOST, settings.MQTT_PORT)
        subscriber.subscribe_all(client)
    else:
        logger.warning("MQTT gagal connect (reason_code=%s)", reason_code)


def _on_disconnect(client, userdata, flags, reason_code, properties=None):
    global _connected
    _connected = False
    logger.warning("MQTT terputus dari broker (reason_code=%s)", reason_code)


client.on_connect = _on_connect
client.on_disconnect = _on_disconnect


def start() -> None:
    # connect_async + loop_start -> non-blocking, auto-reconnect di thread paho. Broker mati
    # saat startup TIDAK BOLEH menjatuhkan REST API -> exception di sini hanya di-log.
    try:
        client.connect_async(settings.MQTT_HOST, settings.MQTT_PORT, 60)
        client.loop_start()
    except Exception:
        logger.exception("Gagal memulai MQTT client (broker mungkin belum hidup)")


def stop() -> None:
    client.loop_stop()
    client.disconnect()


def is_connected() -> bool:
    return _connected
