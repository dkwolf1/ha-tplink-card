const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(
  require("node:path").join(__dirname, "../dist/tplink-deco-mesh-card.js"),
  "utf8",
);
const defs = new Map();
class Element {
  attachShadow() {
    this.shadowRoot = { innerHTML: "", addEventListener: () => {} };
    return this.shadowRoot;
  }
  dispatchEvent() {}
}
const globals = {
  HTMLElement: Element,
  customElements: { get: (n) => defs.get(n), define: (n, c) => defs.set(n, c) },
  document: { createElement: () => ({}) },
  window: { customCards: [] },
  Intl,
  Number,
  JSON,
  Array,
  Date,
  Set,
  Map,
  console,
  Promise,
  CustomEvent: class {},
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
};
vm.runInNewContext(source, globals);
const Card = defs.get("tplink-deco-mesh-card");
const eid = (domain, suffix) => `${domain}.deco_${suffix}`;
const MAC1 = "aa:bb:cc:dd:ee:01",
  MAC2 = "aa:bb:cc:dd:ee:02";
const entities = [];
const states = {};
function add(
  domain,
  key,
  uniqueId,
  deviceId,
  state,
  attributes = {},
  entryId = "entry-a",
) {
  const id = eid(domain, key);
  entities.push({
    entity_id: id,
    unique_id: uniqueId,
    device_id: deviceId,
    platform: "tplink_deco",
    config_entry_id: entryId,
  });
  states[id] = { entity_id: id, state: String(state), attributes };
  return id;
}
add("device_tracker", "woonkamer", MAC1, "dev-main", "home", {
  device_type: "deco",
  master: true,
  friendly_name: "Woonkamer Deco",
  internet_online: true,
  device_model: "X60",
});
add("device_tracker", "keuken", MAC2, "dev-kitchen", "home", {
  device_type: "deco",
  master: false,
  friendly_name: "Keuken Deco",
  deco_mac: MAC1,
  connection_type: "band5",
});
add("device_tracker", "phone", "client-1", "dev-main", "home", {
  device_type: "client",
  ui_device_name: "iPhone",
  deco_mac: MAC1,
  connection_type: "band5",
  down_kilobytes_per_s: 100,
  up_kilobytes_per_s: 23,
});
add("device_tracker", "laptop", "client-2", "dev-kitchen", "home", {
  device_type: "client",
  ui_device_name: "Laptop",
  deco_mac: MAC2,
  connection_type: "wired",
  down_kilobytes_per_s: 280,
  up_kilobytes_per_s: 45,
});
add("sensor", "woonkamer_cpu", `${MAC1}_cpu_usage`, "dev-main", 24);
add("sensor", "woonkamer_mem", `${MAC1}_mem_usage`, "dev-main", 58);
add("sensor", "keuken_cpu", `${MAC2}_cpu_usage`, "dev-kitchen", 19);
add("sensor", "keuken_mem", `${MAC2}_mem_usage`, "dev-kitchen", 48);
add("sensor", "woonkamer_count", `${MAC1}_client_count`, "dev-main", 1);
add("sensor", "keuken_count", `${MAC2}_client_count`, "dev-kitchen", 1);
add("sensor", "total_down", `${MAC1}_total_down`, "dev-main", 380);
add("sensor", "total_up", `${MAC1}_total_up`, "dev-main", 68);
add("sensor", "api_response", `${MAC1}_deco_response_time`, "dev-main", 186);
add("sensor", "api_clients", `${MAC1}_client_response_time`, "dev-main", 174);
add("sensor", "query_mode", `${MAC1}_client_query_mode`, "dev-main", "hybrid");
add("sensor", "client_timeouts", `${MAC1}_client_timeout_count`, "dev-main", 0);
add(
  "sensor",
  "deco_update",
  `${MAC1}_deco_last_successful_update`,
  "dev-main",
  "2026-11-22T09:48:00+01:00",
);
add("binary_sensor", "guest_wifi", `${MAC1}_wifi_guest`, "dev-main", "on", {
  ssid: "MyDecoGuest",
});
add(
  "binary_sensor",
  "internet_online",
  `${MAC1}_internet_online`,
  "dev-main",
  "on",
);
add("switch", "polling", "entry-a_polling", "dev-main", "on");
// unrelated entry: must not count as node
add(
  "device_tracker",
  "neighbour",
  "bb:bb:bb:bb:bb:bb",
  "dev-neighbour",
  "home",
  { device_type: "deco", master: true, friendly_name: "Buren" },
  "entry-b",
);
add("sensor", "last_error", `${MAC1}_client_last_error`, "dev-main", "0");
const decoError = add(
  "sensor",
  "deco_error",
  `${MAC1}_deco_last_error`,
  "dev-main",
  "0",
);
let historyRequests = 0;
let historyEntityIds = [];
const hass = {
  states,
  connection: {
    sendMessagePromise: async (message) => {
      if (message.type === "config/entity_registry/list") return entities;
      if (message.type === "history/history_during_period") {
        historyRequests++;
        historyEntityIds = message.entity_ids;
        const now = Date.now() / 1000;
        return Object.fromEntries(
          message.entity_ids.map((id, i) => [
            id,
            [{ s: i ? "68" : "380", lu: now }],
          ]),
        );
      }
      throw Error("unexpected command " + message.type);
    },
  },
};
async function tick() {
  for (let i = 0; i < 15; i++) await new Promise((r) => setTimeout(r, 1));
}
(async () => {
  const card = new Card();
  card.setConfig({ type: "custom:tplink-deco-mesh-card" });
  card.hass = hass;
  await tick();
  let html = card.shadowRoot.innerHTML;
  assert.ok(html.includes("Woonkamer"));
  assert.ok(html.includes("Keuken"));
  assert.ok(!html.includes("Buren"));
  assert.ok(html.includes("380 kB/s"));
  assert.ok(html.includes("28 clients") === false);
  assert.ok(html.includes("2</strong>") || html.includes("2</b>"));
  assert.ok(html.includes("186 ms"));
  assert.ok(html.includes("MyDecoGuest"));
  assert.ok(html.includes("Geen Recorder-historie beschikbaar.") === false);
  assert.ok(historyRequests > 0);
  assert.ok(html.includes("<circle"));
  assert.ok(html.includes("Geen fout geregistreerd"));
  states[decoError].state = "TimeoutException";
  card.hass = hass;
  await tick();
  assert.ok(card.shadowRoot.innerHTML.includes("TimeoutException"));
  card._selectedNode = eid("device_tracker", "keuken");
  card._queueRender();
  await tick();
  html = card.shadowRoot.innerHTML;
  assert.ok(html.includes("19%"));
  assert.ok(html.includes("Ethernet") || html.includes("5 GHz"));
  states[eid("device_tracker", "laptop")].attributes.ui_device_name =
    "Hernoemde laptop";
  card.hass = hass;
  await tick();
  assert.ok(card.shadowRoot.innerHTML.includes("Hernoemde laptop"));
  delete states[eid("sensor", "total_down")];
  delete states[eid("device_tracker", "phone")].attributes.down_kilobytes_per_s;
  delete states[eid("device_tracker", "laptop")].attributes
    .down_kilobytes_per_s;
  card.hass = hass;
  await tick();
  assert.equal(card._data().down, null);
  states[eid("device_tracker", "phone")].attributes.down_kilobytes_per_s = 0;
  assert.equal(card._data().down, 0);
  states[eid("sensor", "total_down")] = { state: "380", attributes: {} };
  states["sensor.manual_down"] = { state: "42", attributes: {} };
  card.setConfig({
    type: "custom:tplink-deco-mesh-card",
    entities: { down: "sensor.manual_down" },
  });
  await tick();
  assert.equal(card._data().down, 42);
  assert.ok(historyEntityIds.includes("sensor.manual_down"));
  // Missing CPU data remains unknown.
  delete states[eid("sensor", "woonkamer_cpu")];
  card._queueRender();
  await tick();
  assert.ok(card.shadowRoot.innerHTML.includes("CPU hoofd-Deco"));
  // XSS escaping in displayed client names.
  states[eid("device_tracker", "phone")].attributes.ui_device_name =
    "<img src=x onerror=alert(1)>";
  card._selectedNode = eid("device_tracker", "woonkamer");
  card._queueRender();
  await tick();
  assert.ok(card.shadowRoot.innerHTML.includes("&lt;img"));
  // A config entry can select a separate mesh.
  card.setConfig({ type: "custom:tplink-deco-mesh-card", entry_id: "entry-b" });
  card._queueRender();
  await tick();
  assert.ok(card.shadowRoot.innerHTML.includes("Buren"));
  assert.ok(!card.shadowRoot.innerHTML.includes("Woonkamer"));
  assert.ok(defs.has("tplink-deco-mesh-card-editor"));
  assert.equal(Card.getStubConfig().type, "custom:tplink-deco-mesh-card");

  // A card with an unavailable registry and no Recorder still renders live data.
  const unavailable = new Card();
  unavailable.setConfig({
    type: "custom:tplink-deco-mesh-card",
    view: "compact",
  });
  unavailable.hass = {
    states: {
      [eid("device_tracker", "fallback")]: {
        state: "home",
        attributes: {
          device_type: "deco",
          master: true,
          friendly_name: "Voorbeeld Deco",
        },
      },
    },
    connection: {
      sendMessagePromise: async () => {
        throw new Error("Unavailable");
      },
    },
  };
  await tick();
  assert.ok(unavailable.shadowRoot.innerHTML.includes("Voorbeeld"));
  assert.ok(
    unavailable.shadowRoot.innerHTML.includes(
      "Geen Recorder-historie beschikbaar.",
    ),
  );
  assert.equal(unavailable._data().down, null);
  console.log(
    "PASS: registry isolation, node health, actual rates, API, WiFi, history, XSS, multi-entry, editor, label refresh, missing readings, manual source",
  );
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
