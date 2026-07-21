import { type FormEvent, useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { useControllerConfig, useUpdateControllerConfig } from "../../api/controllers";
import type { Controller } from "../../types";

export default function ControllerConfigModal({
  open,
  onClose,
  onSaved,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  controller: Controller | null;
}) {
  const configQuery = useControllerConfig(open ? (controller?.id ?? null) : null);
  const updateConfig = useUpdateControllerConfig(controller?.id ?? 0);

  const [heartbeatS, setHeartbeatS] = useState(30);
  const [wifiSsid, setWifiSsid] = useState("");
  const [ipMode, setIpMode] = useState<"dhcp" | "static">("dhcp");
  const [ipAddress, setIpAddress] = useState("");
  const [mqttBroker, setMqttBroker] = useState("");

  useEffect(() => {
    if (!configQuery.data) return;
    const config = configQuery.data;
    setHeartbeatS(config.heartbeat_s ?? 30);
    setWifiSsid(config.wifi_ssid ?? "");
    setIpMode((config.ip_mode as "dhcp" | "static") ?? "dhcp");
    setIpAddress(config.ip_address ?? "");
    setMqttBroker(config.mqtt_broker ?? "");
  }, [configQuery.data]);

  if (!controller) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateConfig.mutate(
      {
        heartbeat_s: heartbeatS,
        wifi_ssid: wifiSsid,
        ip_mode: ipMode,
        ip_address: ipMode === "static" ? ipAddress : null,
        mqtt_broker: mqttBroker,
      },
      { onSuccess: () => onSaved() },
    );
  }

  return (
    <Modal open={open} title={`Config — ${controller.device_id}`} onClose={onClose}>
      {configQuery.isLoading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Memuat config...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="cfg-heartbeat">
              Heartbeat (detik)
            </label>
            <input
              id="cfg-heartbeat"
              type="number"
              min={1}
              value={heartbeatS}
              onChange={(e) => setHeartbeatS(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="cfg-ssid">
              WiFi SSID
            </label>
            <input
              id="cfg-ssid"
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="cfg-ipmode">
              IP Mode
            </label>
            <select
              id="cfg-ipmode"
              value={ipMode}
              onChange={(e) => setIpMode(e.target.value as "dhcp" | "static")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="dhcp">DHCP</option>
              <option value="static">Static</option>
            </select>
          </div>

          {ipMode === "static" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="cfg-ip">
                IP Address
              </label>
              <input
                id="cfg-ip"
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.50"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="cfg-broker">
              MQTT Broker
            </label>
            <input
              id="cfg-broker"
              type="text"
              value={mqttBroker}
              onChange={(e) => setMqttBroker(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            WiFi password tidak dikelola dari sini — tidak pernah disimpan/ditampilkan oleh backend.
          </p>

          <button
            type="submit"
            disabled={updateConfig.isPending}
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateConfig.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      )}
    </Modal>
  );
}
