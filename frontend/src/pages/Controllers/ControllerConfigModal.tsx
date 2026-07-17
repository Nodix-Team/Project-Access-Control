import { type FormEvent, useEffect, useState } from "react";
import Modal from "../../components/Modal";
import type { Controller } from "../../types";

export interface ControllerConfigResult {
  heartbeat_s: number;
  wifi_ssid: string;
  ip_mode: "dhcp" | "static";
  ip_address: string;
  mqtt_broker: string;
}

export default function ControllerConfigModal({
  open,
  onClose,
  onSave,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (result: ControllerConfigResult) => void;
  controller: Controller | null;
}) {
  const [heartbeatS, setHeartbeatS] = useState(30);
  const [wifiSsid, setWifiSsid] = useState("");
  const [ipMode, setIpMode] = useState<"dhcp" | "static">("dhcp");
  const [ipAddress, setIpAddress] = useState("");
  const [mqttBroker, setMqttBroker] = useState("");
  // Write-only - TIDAK PERNAH di-seed dari data controller (backend juga tidak pernah
  // mengirimkannya balik, lihat catatan keamanan di architecture_proposal_v0.2.md).
  const [wifiPassword, setWifiPassword] = useState("");

  useEffect(() => {
    if (!open || !controller) return;
    setHeartbeatS(controller.heartbeat_s);
    setWifiSsid(controller.wifi_ssid ?? "");
    setIpMode(controller.ip_mode);
    setIpAddress(controller.ip_address ?? "");
    setMqttBroker(controller.mqtt_broker ?? "");
    setWifiPassword("");
  }, [open, controller]);

  if (!controller) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      heartbeat_s: heartbeatS,
      wifi_ssid: wifiSsid,
      ip_mode: ipMode,
      ip_address: ipAddress,
      mqtt_broker: mqttBroker,
    });
    setWifiPassword("");
  }

  return (
    <Modal open={open} title={`Config — ${controller.device_id}`} onClose={onClose}>
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
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="cfg-wifi-pass">
            Set WiFi Password baru (opsional)
          </label>
          <input
            id="cfg-wifi-pass"
            type="password"
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
            placeholder="Kosongkan bila tidak ingin mengubah"
            autoComplete="new-password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Write-only — password tersimpan tidak pernah ditampilkan kembali di sini.
          </p>
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

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Simpan
        </button>
      </form>
    </Modal>
  );
}
