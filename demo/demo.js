const demoIcons = {
  "access-point-network": "⌁",
  "arrow-down-bold": "↓",
  "arrow-up-bold": "↑",
  "chart-areaspline": "⌇",
  chip: "▣",
  "code-braces": "{}",
  devices: "▤",
  earth: "◎",
  "help-circle-outline": "?",
  lan: "↔",
  memory: "▥",
  refresh: "↻",
  "timer-outline": "◷",
  "tune-variant": "☷",
  wifi: "⌁",
};

class DemoIcon extends HTMLElement {
  connectedCallback() {
    const name = this.getAttribute("icon")?.slice(4);
    this.textContent = demoIcons[name] ?? "◇";
    this.setAttribute("aria-hidden", "true");
  }
}
customElements.define("ha-icon", DemoIcon);

const states = {},
  registry = [];
const macs = [
  "11:22:33:44:00:01",
  "11:22:33:44:00:02",
  "11:22:33:44:00:03",
  "11:22:33:44:00:04",
];
function add(domain, id, uid, deviceId, state, attrs = {}) {
  const eid = `${domain}.${id}`;
  registry.push({
    platform: "tplink_deco",
    entity_id: eid,
    unique_id: uid,
    device_id: deviceId,
    config_entry_id: "demo",
  });
  states[eid] = { state: String(state), entity_id: eid, attributes: attrs };
}
let areas = ["Woonkamer", "Keuken", "Zolder", "Slaapkamer"];
areas.forEach((name, i) => {
  const mac = macs[i],
    dev = "deco" + i;
  add("device_tracker", `deco_${name.toLowerCase()}`, mac, dev, "home", {
    device_type: "deco",
    friendly_name: name + " Deco",
    master: i === 0,
    deco_mac: i ? macs[0] : undefined,
    connection_type: i === 2 ? "wired" : "band5",
    device_model: "X60",
    internet_online: true,
  });
  add("sensor", `cpu_${i}`, mac + "_cpu_usage", dev, [24, 18, 26, 32][i]);
  add("sensor", `memory_${i}`, mac + "_mem_usage", dev, [58, 42, 47, 44][i]);
  add("sensor", `count_${i}`, mac + "_client_count", dev, [14, 5, 4, 5][i]);
});
add("sensor", "throughput_down", macs[0] + "_total_down", "deco0", 1240);
add("sensor", "throughput_up", macs[0] + "_total_up", "deco0", 320);
add("sensor", "api_response", macs[0] + "_deco_response_time", "deco0", 6145);
add(
  "sensor",
  "client_response",
  macs[0] + "_client_response_time",
  "deco0",
  152,
);
add("sensor", "query", macs[0] + "_client_query_mode", "deco0", "Hybrid");
add("sensor", "timeouts", macs[0] + "_client_timeout_count", "deco0", 0);
add("sensor", "last_error", macs[0] + "_client_last_error", "deco0", 0);
add(
  "sensor",
  "updated",
  macs[0] + "_deco_last_successful_update",
  "deco0",
  new Date().toISOString(),
);
add("binary_sensor", "wifi_main", macs[0] + "_wifi_main", "deco0", "on", {
  ssid: "DecoNet",
});
add("binary_sensor", "wifi_guest", macs[0] + "_wifi_guest", "deco0", "on", {
  ssid: "DecoGast",
});
add("binary_sensor", "wifi_iot", macs[0] + "_wifi_iot", "deco0", "off", {
  ssid: "DecoIoT",
});
add("switch", "deco_polling", "demo_polling", "deco0", "on");
for (let i = 0; i < 28; i++) {
  const mac = macs[i < 14 ? 0 : i < 19 ? 1 : i < 23 ? 2 : 3];
  add("device_tracker", `client_${i}`, "client" + i, "client" + i, "home", {
    device_type: "client",
    deco_mac: mac,
    connection_type:
      i === 0 ? "unknown" : i % 3 === 0 ? "wired" : i % 2 ? "band5" : "band2_4",
    ui_device_name: "Apparaat " + (i + 1),
    down_kilobytes_per_s: 3,
    up_kilobytes_per_s: 1,
  });
}
const hass = {
  states,
  connection: {
    sendMessagePromise: async ({ type, start_time, end_time, entity_ids }) => {
      if (type === "config/entity_registry/list") return registry;
      if (type !== "history/history_during_period") return {};
      const end = Date.parse(end_time) / 1000;
      const start = Date.parse(start_time) / 1000;
      const count = 65;
      return Object.fromEntries(
        entity_ids.map((id, channel) => [
          id,
          Array.from({ length: count }, (_, index) => {
            const wave = (Math.sin(index * 0.19) + 1) / 2;
            const peak = index % 11 === 0 ? 250 : 0;
            const traffic =
              80 + wave * (channel ? 135 : 540) + peak + ((index * 13) % 47);
            return {
              lu: start + ((end - start) * index) / (count - 1),
              s: String(Math.round(traffic)),
            };
          }),
        ]),
      );
    },
  },
};
const card = document.getElementById("card");
card.setConfig({
  type: "custom:tplink-deco-mesh-card",
  view: "wide",
  title: "TP-Link Deco",
  history_hours: 1,
});
card.hass = hass;
