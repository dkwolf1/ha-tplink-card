/*
 * TP-Link Deco Mesh Live Card v1.3.0
 * Independent Home Assistant Lovelace custom card for amosyuen/ha-tplink-deco.
 * No external dependencies, no direct modem credentials/API calls.
 * MIT License - 2026
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2026 TP-Link Deco Mesh Live contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(() => {
  "use strict";
  const CARD_TYPE = "tplink-deco-mesh-card";
  const PREFIX = "tplink-deco-mesh";
  const CLIENT_PREVIEW_LIMIT = 12;
  const measureTime = new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const clockTime = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateAndTime = new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const chartNumber = new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: 10,
  });
  const COMPACT_WIDTH = 590;
  const WIDE_WIDTH = 900;
  const VIEW_LABELS = {
    auto: "Automatisch",
    compact: "Compact",
    expanded: "Uitgebreid",
    wide: "Breed",
  };
  const DEFAULT_SECTIONS = [
    "topology",
    "traffic",
    "nodes",
    "clients",
    "wifi",
    "api",
  ];
  const SECTION_LABELS = {
    topology: "Mesh-topologie",
    traffic: "Netwerkactiviteit",
    nodes: "Deco-diagnostiek",
    clients: "Clients",
    wifi: "WiFi-netwerken",
    api: "Coordinator / API",
  };
  const nf = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const valid = (v) =>
    v !== undefined &&
    v !== null &&
    v !== "" &&
    v !== "unknown" &&
    v !== "unavailable" &&
    v !== "None" &&
    v !== "none";
  const num = (v) => {
    if (!valid(v)) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const normalize = (v) =>
    String(v || "")
      .trim()
      .toLowerCase();
  const isOnline = (s) =>
    valid(s)
      ? ["home", "on", "connected", "online", "true", "1"].includes(
          normalize(s),
        )
      : null;
  const stateVal = (hass, id) => (id ? hass?.states?.[id] : null);
  const numeric = (s) => num(s?.state);
  const field = (v, suffix = "") =>
    v == null ? "—" : `${nf.format(v)}${suffix}`;
  const duration = (ms) =>
    ms >= 1000 ? field(ms / 1000, " s") : field(ms, " ms");
  const boolAttr = (v) =>
    v === true || ["on", "online", "yes", "true", "1"].includes(normalize(v));
  function prettyName(raw) {
    return (
      String(raw || "Deco")
        .replace(/^TP[- ]?Link\s+/i, "")
        .replace(/\s+Deco$/i, "")
        .trim() || "Deco"
    );
  }
  function modeLabel(v) {
    const a = Array.isArray(v) ? v[0] : v;
    const s = normalize(a);
    if (["wired", "ethernet", "lan"].includes(s)) return "Ethernet";
    if (["band5", "5g", "5ghz", "5_ghz", "wifi_5g"].includes(s)) return "5 GHz";
    if (["band2_4", "2.4g", "2_4ghz", "2.4ghz"].includes(s)) return "2,4 GHz";
    if (s === "wireless") return "WiFi";
    return valid(a) ? String(a) : "—";
  }
  function reading(hass, item) {
    return numeric(stateVal(hass, item));
  }
  function macOf(entry, hassState) {
    return normalize(hassState?.attributes?.mac || entry?.unique_id || "");
  }
  function timeLabel(s) {
    if (!valid(s)) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return new Intl.DateTimeFormat("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(d);
  }
  const ico = (name, size = 20) =>
    `<ha-icon icon="mdi:${esc(name)}" style="--mdc-icon-size:${size}px;width:${size}px;height:${size}px"></ha-icon>`;

  function nearestSample(series, t) {
    let low = 0,
      high = series.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (series[mid].t < t) low = mid + 1;
      else high = mid;
    }
    const before = series[low - 1],
      after = series[low];
    if (!before || (after && after.t - t < t - before.t)) return after;
    return before;
  }

  function trendSvg({ down, up, start, end }) {
    if (!down.length && !up.length) {
      return `<div class="empty-small">Geen Recorder-historie beschikbaar.</div>`;
    }
    const width = 640,
      height = 150,
      padding = 4;
    let peak = 1;
    for (const series of [down, up]) {
      for (const { v } of series) peak = Math.max(peak, v);
    }
    const step = 10 ** Math.floor(Math.log10(peak));
    const ceiling = Math.ceil(peak / step) * step;
    const x = (t) =>
      (Math.max(0, Math.min(1, (t - start) / (end - start))) * width).toFixed(
        1,
      );
    const y = (v) =>
      (
        height -
        padding -
        (Math.max(0, v) / ceiling) * (height - 2 * padding)
      ).toFixed(1);
    const draw = (series, color, area = false) => {
      if (!series.length) return "";
      const first = series[0],
        last = series[series.length - 1];
      if (series.length === 1)
        return `<circle cx="${x(first.t)}" cy="${y(first.v)}" r="3" fill="${color}"/>`;
      const line = series
        .map(({ t, v }, i) => `${i ? "L" : "M"}${x(t)},${y(v)}`)
        .join(" ");
      const fill = area
        ? `<path d="${line} L${x(last.t)},${height - padding} L${x(first.t)},${height - padding} Z" fill="url(#${PREFIX}-fill)"/>`
        : "";
      return `${fill}<path d="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    };
    const tickFormat =
      new Date(start).toDateString() === new Date(end).toDateString()
        ? clockTime
        : dateAndTime;
    const ticks = [start, (start + end) / 2, end]
      .map((t) => `<span>${esc(tickFormat.format(t))}</span>`)
      .join("");
    return `<div class="chart">
      <div class="chart-unit">kB/s</div>
      <div class="chart-scale"><span>${esc(nf.format(ceiling))}</span><span>${esc(nf.format(ceiling / 2))}</span><span>0</span></div>
      <div class="chart-plot" tabindex="0" role="group" aria-label="Historische download en upload. Gebruik de pijltjestoetsen om metingen te bekijken." aria-describedby="${PREFIX}-readout">
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="${PREFIX}-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#27e5c4" stop-opacity=".27"/><stop offset="100%" stop-color="#27e5c4" stop-opacity="0"/></linearGradient></defs>
          <path class="grid-line" d="M0 ${padding} H${width} M0 ${height / 2} H${width} M0 ${height - padding} H${width}" vector-effect="non-scaling-stroke"/>
          ${draw(down, "#29e5c6", true)}${draw(up, "#71b8fd")}
        </svg>
        <span class="chart-cursor" aria-hidden="true" hidden></span>
      </div>
      <div class="chart-times">${ticks}</div>
      <div class="chart-readout" id="${PREFIX}-readout"><span data-series="down"></span><span data-series="up"></span></div>
    </div>`;
  }

  class DecoMeshCard extends HTMLElement {
    static getStubConfig() {
      return {
        type: `custom:${CARD_TYPE}`,
        title: "TP-Link Deco",
        view: "auto",
      };
    }
    static getConfigElement() {
      return document.createElement(`${CARD_TYPE}-editor`);
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = {};
      this._hass = null;
      this._registry = null;
      this._regError = "";
      this._registryConnection = null;
      this._registryLoading = false;
      this._history = { down: [], up: [] };
      this._historyKey = "";
      this._historyAt = 0;
      this._historyLoading = false;
      this._selectedNode = null;
      this._showAllClients = false;
      this._chartTime = null;
      this._localSections = null;
      this._expanded = false;
      this._cardWidth = 0;
      this._lastMarkup = "";
      this._renderQueued = false;
      this._resizeObserver =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver((entries) => {
              const previousLayout = this._layout();
              this._cardWidth = entries[0]?.contentRect.width ?? 0;
              if (this._layout() !== previousLayout) this._queueRender();
            })
          : null;
      this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
      this.shadowRoot.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "touch") this._pointAtChart(event);
      });
      this.shadowRoot.addEventListener("pointerout", (event) => {
        const plot = event.target.closest(".chart-plot");
        if (
          plot &&
          !plot.contains(event.relatedTarget) &&
          event.pointerType !== "touch"
        ) {
          this._chartTime = null;
          this._updateChartReadout(plot);
        }
      });
      this.shadowRoot.addEventListener("keydown", (event) =>
        this._chartKeydown(event),
      );
    }
    connectedCallback() {
      this._resizeObserver?.observe(this);
      this._queueRender();
    }
    disconnectedCallback() {
      this._resizeObserver?.disconnect();
    }
    setConfig(config) {
      if (!config || config.type !== `custom:${CARD_TYPE}`)
        throw new Error(`type moet custom:${CARD_TYPE} zijn`);
      this._config = { ...config };
      this._localSections = null;
      this._historyKey = "";
      this._chartTime = null;
      this._queueRender();
    }
    set hass(value) {
      this._hass = value;
      this._ensureRegistry();
      this._queueRender();
    }
    getCardSize() {
      return this._isCompact() ? 5 : 10;
    }
    getGridOptions() {
      return {
        columns: 12,
        min_columns: 4,
        rows: this._isCompact() ? 7 : 11,
        min_rows: 4,
      };
    }
    _layout() {
      const view = this._config.view;
      if (view === "compact" || view === "expanded") return view;
      if (view === "wide" && this._cardWidth >= WIDE_WIDTH) return "wide";
      if (this._cardWidth > 0 && this._cardWidth < COMPACT_WIDTH)
        return "compact";
      return "expanded";
    }
    _isCompact() {
      return this._layout() === "compact";
    }
    _queueRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      Promise.resolve().then(() => {
        this._renderQueued = false;
        this._render();
      });
    }
    async _ensureRegistry() {
      const conn = this._hass?.connection;
      if (
        !conn?.sendMessagePromise ||
        this._registryLoading ||
        this._registryConnection === conn
      )
        return;
      this._registryLoading = true;
      this._registryConnection = conn;
      try {
        const entities = await conn.sendMessagePromise({
          type: "config/entity_registry/list",
        });
        if (this._registryConnection !== conn) return;
        this._registry = (Array.isArray(entities) ? entities : []).filter(
          (e) => e.platform === "tplink_deco",
        );
        this._regError = "";
      } catch (e) {
        if (this._registryConnection !== conn) return;
        this._registry = null;
        this._regError =
          "Entityregister niet toegankelijk; beperkte detectie via tracker-attributen.";
      } finally {
        this._registryLoading = false;
        this._queueRender();
      }
    }
    _allowedEntries() {
      const all = this._registry || [];
      const grouped = new Map();
      for (const e of all) {
        const id = e.config_entry_id || "onbekend";
        grouped.set(id, (grouped.get(id) || 0) + 1);
      }
      const ids = [...grouped.keys()].sort();
      const selected = this._config.entry_id || ids[0] || null;
      return {
        ids,
        selected,
        multiple: ids.length > 1 && !this._config.entry_id,
      };
    }
    _data() {
      const hass = this._hass,
        cfg = this._config,
        entries = this._allowedEntries();
      const allStates = hass?.states || {};
      const regs = (this._registry || []).filter(
        (e) =>
          !entries.selected ||
          e.config_entry_id === entries.selected ||
          (!e.config_entry_id && entries.selected === "onbekend"),
      );
      const ids = new Set(regs.map((e) => e.entity_id));
      const registryAvailable = this._registry !== null;
      const stateEntries = Object.entries(allStates).filter(
        ([id, s]) =>
          id.startsWith("device_tracker.") &&
          s?.attributes?.device_type &&
          ["deco", "client"].includes(s.attributes.device_type) &&
          (!registryAvailable || ids.has(id)),
      );
      // Prefer the integration registry. Fallback only if it cannot be read.
      const regFor = (entityId) => regs.find((e) => e.entity_id === entityId);
      const sensorEntity = (suffix, deviceId = null, uniquePrefix = null) => {
        const match = regs.find(
          (e) =>
            e.entity_id?.startsWith("sensor.") &&
            normalize(e.unique_id).endsWith(`_${suffix}`) &&
            (deviceId == null || e.device_id === deviceId) &&
            (uniquePrefix == null ||
              normalize(e.unique_id).startsWith(uniquePrefix)),
        );
        return match?.entity_id || null;
      };
      const binEntity = (suffix, deviceId = null) =>
        regs.find(
          (e) =>
            e.entity_id?.startsWith("binary_sensor.") &&
            normalize(e.unique_id).endsWith(`_${suffix}`) &&
            (deviceId == null || e.device_id === deviceId),
        )?.entity_id || null;
      const switchEntity = (suffix) =>
        regs.find(
          (e) =>
            e.entity_id?.startsWith("switch.") &&
            normalize(e.unique_id).endsWith(suffix),
        )?.entity_id || null;
      const manual = cfg.entities || {};
      const nodes = stateEntries
        .filter(([, s]) => s.attributes.device_type === "deco")
        .map(([id, s]) => {
          const e = regFor(id),
            a = s.attributes,
            mac = macOf(e, s),
            deviceId = e?.device_id || null;
          const get = (suffix) =>
            reading(
              hass,
              sensorEntity(suffix, deviceId, deviceId ? null : mac),
            );
          const parentMac = normalize(a.deco_mac),
            parentName = String(a.deco_device || "");
          const label =
            (cfg.node_labels || {})[id] ||
            (cfg.node_labels || {})[mac] ||
            prettyName(
              a.friendly_name ||
                id.replace("device_tracker.", "").replace(/_/g, " "),
            );
          const internetEntity = binEntity("internet_online", deviceId);
          const onlineEntity = binEntity("online", deviceId);
          const internetState = stateVal(hass, internetEntity),
            onlineState = stateVal(hass, onlineEntity);
          const connection = modeLabel(a.connection_type);
          return {
            id,
            name: label,
            mac,
            master: boolAttr(a.master),
            parentMac,
            parentName,
            deviceId,
            online:
              onlineState && valid(onlineState.state)
                ? isOnline(onlineState.state)
                : isOnline(s.state),
            internet:
              internetState && valid(internetState.state)
                ? isOnline(internetState.state)
                : typeof a.internet_online === "boolean"
                  ? a.internet_online
                  : valid(a.internet_online)
                    ? boolAttr(a.internet_online)
                    : null,
            connection,
            clients: get("client_count"),
            cpu: get("cpu_usage"),
            memory: get("mem_usage"),
            backhaulSpeed: get("backhaul_speed"),
            backhaulMax: get("backhaul_max_speed"),
            ip: a.ip_address || null,
            model: a.device_model || null,
            signal24: num(a.signal_band2_4),
            signal5: num(a.signal_band5),
            down: get("down"),
            up: get("up"),
            tracker: s,
          };
        })
        .sort(
          (a, b) =>
            Number(b.master) - Number(a.master) ||
            a.name.localeCompare(b.name, "nl"),
        );
      const master = nodes.find((x) => x.master) || nodes[0] || null;
      const clients = stateEntries
        .filter(([, s]) => s.attributes.device_type === "client")
        .map(([id, s]) => {
          const a = s.attributes;
          return {
            id,
            name: a.ui_device_name || a.friendly_name || id,
            online: isOnline(s.state),
            mac: normalize(a.deco_mac),
            decoName: String(a.deco_device || ""),
            type: modeLabel(a.connection_type),
            down: num(a.down_kilobytes_per_s),
            up: num(a.up_kilobytes_per_s),
          };
        });
      for (const n of nodes) {
        const associated = clients.filter(
          (c) =>
            c.online &&
            ((n.mac && c.mac === n.mac) ||
              (!c.mac &&
                c.decoName &&
                normalize(c.decoName) === normalize(n.name))),
        );
        n.associated = associated;
        n.clientsCount =
          n.clients ?? (clients.length ? associated.length : null);
      }
      const sourceDown = manual.down || sensorEntity("total_down");
      const sourceUp = manual.up || sensorEntity("total_up");
      const trafficRate = (source, key) =>
        reading(hass, source) ??
        clients.reduce((total, client) => {
          if (!client.online || client[key] == null) return total;
          return (total ?? 0) + client[key];
        }, null);
      const down = trafficRate(sourceDown, "down");
      const up = trafficRate(sourceUp, "up");
      const clientCount = clients.length
        ? clients.filter((c) => c.online).length
        : nodes.length && nodes.every((n) => n.clients != null)
          ? nodes.reduce((sum, n) => sum + n.clients, 0)
          : null;
      const wifi = {};
      for (const band of ["main", "guest", "iot"]) {
        const auto = binEntity(`wifi_${band}`);
        const entity = manual[`wifi_${band}`] || auto;
        const state = stateVal(hass, entity);
        wifi[band] = {
          id: entity,
          on: state && valid(state.state) ? isOnline(state.state) : null,
          ssid: state?.attributes?.ssid || null,
        };
      }
      const first = (suffix) =>
        sensorEntity(suffix, master?.deviceId) || sensorEntity(suffix);
      const status = (suffix, override) =>
        stateVal(hass, override || first(suffix));
      const lastErrors = manual.last_error
        ? [stateVal(hass, manual.last_error)?.state]
        : [
            status("client_last_error")?.state,
            status("deco_last_error")?.state,
          ];
      const lastError =
        lastErrors.find((value) => valid(value) && String(value) !== "0") ??
        (lastErrors.some((value) => String(value) === "0")
          ? "Geen fout geregistreerd"
          : null);
      const pollingID =
        manual.polling ||
        switchEntity("_polling") ||
        regs.find(
          (e) =>
            e.entity_id?.startsWith("switch.") &&
            normalize(e.entity_id).includes("polling"),
        )?.entity_id;
      const pollingState = stateVal(hass, pollingID);
      return {
        entries,
        nodes,
        master,
        clients,
        wifi,
        down,
        up,
        clientCount,
        internet: master?.internet ?? null,
        polling:
          pollingState && valid(pollingState.state)
            ? isOnline(pollingState.state)
            : null,
        pollingId: pollingID,
        decoUpdate:
          status("deco_last_successful_update", manual.deco_update)?.state ||
          null,
        clientUpdate:
          status("client_last_successful_update", manual.client_update)
            ?.state || null,
        response: reading(
          hass,
          manual.response_time || first("deco_response_time"),
        ),
        clientResponse: reading(
          hass,
          manual.client_response_time || first("client_response_time"),
        ),
        queryMode:
          status("client_query_mode", manual.query_mode)?.state || null,
        timeouts: reading(
          hass,
          manual.timeouts || first("client_timeout_count"),
        ),
        lastError,
        sourceDown,
        sourceUp,
        registryAvailable,
      };
    }
    _historyPeriod() {
      return Math.min(
        168,
        Math.max(1, Number(this._config.history_hours) || 1),
      );
    }
    async _ensureHistory(d) {
      const connection = this._hass?.connection;
      const ids = [...new Set([d.sourceDown, d.sourceUp].filter(Boolean))];
      if (this._isCompact() && this._config.compact_chart === false) return;
      if (
        !ids.length ||
        !this._sections().includes("traffic") ||
        !connection?.sendMessagePromise
      ) {
        this._historyKey = "";
        this._history = { down: [], up: [] };
        return;
      }
      const hours = this._historyPeriod();
      const key = JSON.stringify([d.sourceDown, d.sourceUp, hours]);
      const sameQuery =
        this._historyConnection === connection && this._historyKey === key;
      if (
        this._historyLoading ||
        (sameQuery && Date.now() - this._historyAt < 120000)
      )
        return;

      this._historyConnection = connection;
      this._historyKey = key;
      this._historyAt = Date.now();
      this._historyLoading = true;
      if (!sameQuery) this._history = { down: [], up: [] };
      const end = this._historyAt;
      const start = end - hours * 3600000;
      const parse = (rows) =>
        (Array.isArray(rows) ? rows : [])
          .flatMap((row) => {
            const raw =
              row?.lu ?? row?.lc ?? row?.last_updated ?? row?.last_changed;
            const t =
              typeof raw === "number"
                ? raw < 1e11
                  ? raw * 1000
                  : raw
                : Date.parse(raw);
            const v = num(row?.s ?? row?.state);
            return Number.isFinite(t) && v != null ? [{ t, v }] : [];
          })
          .sort((a, b) => a.t - b.t);
      try {
        const result = await connection.sendMessagePromise({
          type: "history/history_during_period",
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          entity_ids: ids,
          minimal_response: true,
          no_attributes: true,
        });
        if (key === this._historyKey && connection === this._hass?.connection) {
          this._history = {
            down: parse(result?.[d.sourceDown]),
            up: parse(result?.[d.sourceUp]),
            start,
            end,
          };
        }
      } catch {
        if (key === this._historyKey && connection === this._hass?.connection) {
          this._history = { down: [], up: [] };
        }
      } finally {
        this._historyLoading = false;
        this._queueRender();
      }
    }
    _pointAtChart(event) {
      const plot = event.target.closest(".chart-plot");
      if (!plot) return false;
      const bounds = plot.getBoundingClientRect();
      const { start, end } = this._history;
      if (bounds.width > 0) {
        const fraction = Math.max(
          0,
          Math.min(1, (event.clientX - bounds.left) / bounds.width),
        );
        this._chartTime = start + fraction * (end - start);
        this._updateChartReadout(plot);
      }
      return true;
    }
    _chartKeydown(event) {
      const plot = event.target.closest(".chart-plot");
      if (!plot || !["ArrowLeft", "ArrowRight", "Escape"].includes(event.key))
        return;
      event.preventDefault();
      if (event.key === "Escape") this._chartTime = null;
      else {
        const { start, end } = this._history;
        const step = (end - start) / 20;
        const time = this._chartTime ?? (start + end) / 2;
        this._chartTime = Math.max(
          start,
          Math.min(end, time + (event.key === "ArrowRight" ? step : -step)),
        );
      }
      this._updateChartReadout(plot);
    }
    _updateChartReadout(plot) {
      const cursor = plot.querySelector(".chart-cursor");
      const readout = plot.closest(".chart").querySelector(".chart-readout");
      const { down, up, start, end } = this._history;
      const time = this._chartTime;
      const download = time == null ? undefined : nearestSample(down, time);
      const upload = time == null ? undefined : nearestSample(up, time);
      const closest =
        !upload ||
        (download && Math.abs(download.t - time) <= Math.abs(upload.t - time))
          ? download
          : upload;
      cursor.hidden = !closest;
      if (closest)
        cursor.style.left = `${Math.max(0, Math.min(1, (closest.t - start) / (end - start))) * 100}%`;
      for (const [series, label, sample] of [
        ["down", "Download", download],
        ["up", "Upload", upload],
      ]) {
        readout.querySelector(`[data-series="${series}"]`).textContent = sample
          ? `${label} ${chartNumber.format(sample.v)} kB/s · ${measureTime.format(sample.t)}`
          : closest
            ? `${label} —`
            : "";
      }
    }
    _sections() {
      return this._localSections || this._config.sections || DEFAULT_SECTIONS;
    }
    _onClick(e) {
      if (this._pointAtChart(e)) return;
      const b = e.target.closest("[data-action]");
      if (!b) return;
      const a = b.dataset.action;
      if (a === "node") {
        if (this._selectedNode !== b.dataset.id) this._showAllClients = false;
        this._selectedNode = b.dataset.id;
        this._queueRender();
      } else if (a === "clear-node") {
        this._selectedNode = null;
        this._showAllClients = false;
        this._queueRender();
      } else if (a === "toggle-clients") {
        this._showAllClients = !this._showAllClients;
        this._queueRender();
      } else if (a === "toggle-expand") {
        this._expanded = !this._expanded;
        this._queueRender();
      } else if (a === "toggle-section") {
        const section = b.dataset.section,
          set = new Set(this._sections());
        set.has(section) ? set.delete(section) : set.add(section);
        this._localSections = [...set];
        this._queueRender();
      } else if (a === "all-sections") {
        this._localSections = DEFAULT_SECTIONS.slice();
        this._queueRender();
      } else if (a === "retry") {
        this._registryConnection = null;
        this._ensureRegistry();
        this._queueRender();
      } else if (a === "hours") {
        this._config = {
          ...this._config,
          history_hours: Number(b.dataset.value),
        };
        this._historyKey = "";
        this._chartTime = null;
        this._queueRender();
      }
    }
    _statusPill(value, yes = "Online", no = "Offline") {
      return `<span class="status ${value === true ? "ok" : value === false ? "bad" : "unknown"}"><i></i>${esc(value === true ? yes : value === false ? no : "Onbekend")}</span>`;
    }
    _metric(label, value, icon) {
      return `<div class="metric"><span class="metric-icon">${ico(icon, 22)}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong></div></div>`;
    }
    _topology(d) {
      const nodes = d.nodes,
        master = d.master;
      if (!nodes.length)
        return `<div class="empty-small">Geen Deco-nodes gevonden.</div>`;
      const satellites = nodes.filter((n) => n !== master).slice(0, 10);
      const pos = [
        [175, 138],
        [815, 126],
        [820, 290],
        [174, 300],
        [495, 42],
        [420, 313],
        [130, 47],
        [875, 45],
        [725, 35],
        [270, 38],
      ];
      const positions = [
        { n: master, x: 495, y: 207, root: true },
        ...satellites.map((n, i) => ({
          n,
          x: pos[i][0],
          y: pos[i][1],
          root: false,
        })),
      ];
      const w = 1000,
        h = 380;
      const lines = positions
        .filter((p) => !p.root)
        .map((p) => {
          const m =
            positions.find((q) => q.n.mac === p.n.parentMac) ||
            positions.find(
              (q) => normalize(q.n.name) === normalize(p.n.parentName),
            ) ||
            positions[0];
          const midX = (m.x + p.x) / 2,
            midY = (m.y + p.y) / 2 - 20;
          return `<path d="M${m.x} ${m.y} Q${midX} ${midY} ${p.x} ${p.y}" class="link-path"/>`;
        })
        .join("");
      const cards = positions
        .map(({ n, x, y, root }) => {
          const current = n.id === this._selectedNode;
          const type = root ? "Hoofd-Deco" : n.connection;
          return `<button type="button" data-action="node" data-id="${esc(n.id)}" aria-label="Details van ${esc(n.name)}" class="node ${root ? "root" : ""} ${current ? "selected" : ""} ${n.online === false ? "offline" : ""}" style="left:${(x / w) * 100}%;top:${(y / h) * 100}%"><span class="cylinder"></span><b title="${esc(n.name)}">${esc(n.name)}</b><span class="node-type">${esc(type)}</span><span class="node-info">${this._statusPill(n.online)}<small>${n.clientsCount == null ? "—" : esc(n.clientsCount)} clients</small></span></button>`;
        })
        .join("");
      const total = nodes.length - satellites.length;
      return `<div class="topology"><div class="topology-meta">${ico("access-point-network", 17)} ${esc(nodes.length)} Deco-units · ${esc(satellites.length)} satellieten${total > 1 ? ` · ${esc(total - 1)} niet getoond` : ""}</div><div class="mesh-canvas"><div class="waves"></div><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M495 0 V157" class="internet-path"/>${lines}</svg><div class="internet-node">${ico("earth", 15)} Internet ${this._statusPill(d.internet)}</div>${cards}</div><div class="topology-note">Logisch overzicht op basis van de gemelde hoofd-Deco en satellietkoppelingen. Geen gemeten radiopad of signaalsterkte tussen nodes.</div></div>`;
    }
    _nodeDetails(d) {
      const n = d.nodes.find((n) => n.id === this._selectedNode);
      if (!n) return "";
      const line = (l, v) =>
        `<div><small>${esc(l)}</small><b>${esc(v)}</b></div>`;
      const remaining = Math.max(0, n.associated.length - CLIENT_PREVIEW_LIMIT);
      const listed = this._showAllClients
        ? n.associated
        : n.associated.slice(0, CLIENT_PREVIEW_LIMIT);
      const clients = listed
        .map(
          (c) =>
            `<span class="client-chip">${ico("cellphone-link", 14)}${esc(c.name)}</span>`,
        )
        .join("");
      return `<section class="detail-panel"><div class="section-head"><h3>${ico("router-wireless", 17)} ${esc(n.name)}</h3><button type="button" class="tiny-btn" data-action="clear-node" aria-label="Details sluiten">✕</button></div><div class="detail-grid">${line("Status", n.online === true ? "Online" : n.online === false ? "Offline" : "—")}${line("Backhaul", n.master ? "Hoofd-Deco" : n.connection)}${line("CPU", field(n.cpu, "%"))}${line("Geheugen", field(n.memory, "%"))}${line("Backhaul snelheid", field(n.backhaulSpeed, " Mbit/s"))}${line("Backhaul maximum", field(n.backhaulMax, " Mbit/s"))}${line("Model", n.model || "—")}${line("Verbonden clients", n.clientsCount == null ? "—" : n.clientsCount)}</div>${clients ? `<div class="client-chips">${clients}${remaining ? `<button type="button" class="tiny-btn" data-action="toggle-clients" aria-expanded="${this._showAllClients}">${this._showAllClients ? "Minder tonen" : `+${remaining} meer`}</button>` : ""}</div>` : ""}</section>`;
    }
    _nodesPanel(d) {
      return `<section class="panel"><div class="section-head"><h3>${ico("access-point-network", 19)} Deco-status en diagnose</h3><small>CPU / RAM per node</small></div><div class="node-table"><div class="node-table-head"><span>Deco</span><span>Clients</span><span>CPU</span><span>RAM</span><span>Backhaul</span></div>${d.nodes.map((n) => `<button type="button" class="node-table-row" data-action="node" data-id="${esc(n.id)}"><span class="name-cell"><i class="dot ${n.online === true ? "on" : n.online === false ? "off" : ""}"></i>${esc(n.name)}</span><span>${n.clientsCount == null ? "—" : esc(n.clientsCount)}</span><span>${field(n.cpu, "%")}</span><span>${field(n.memory, "%")}</span><span>${esc(n.master ? "Hoofd" : n.connection)}</span></button>`).join("")}</div></section>`;
    }
    _clientsPanel(d) {
      const active = d.clients.filter((c) => c.online);
      const groups = [
        ["2,4 GHz", "wifi"],
        ["5 GHz", "wifi"],
        ["Ethernet", "lan"],
      ];
      const counts = new Map(groups.map(([label]) => [label, 0]));
      for (const client of active) {
        const label = counts.has(client.type) ? client.type : "Onbekend/overig";
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      if (counts.has("Onbekend/overig"))
        groups.push(["Onbekend/overig", "help-circle-outline"]);
      const bands = groups
        .map(
          ([label, icon]) =>
            `<div>${ico(icon, 16)} ${label} <strong>${d.clients.length ? counts.get(label) : "—"}</strong></div>`,
        )
        .join("");
      return `<section class="panel"><div class="section-head"><h3>${ico("devices", 19)} Clientactiviteit</h3></div><div class="clients-big">${d.clientCount == null ? "—" : esc(d.clientCount)} <span>verbonden clients</span></div><div class="bands">${bands}</div><small class="hint">Clientband komt uit het door Deco gemelde verbindingstype.</small></section>`;
    }
    _wifiPanel(d) {
      const names = {
        main: "Hoofdnetwerk",
        guest: "Gastnetwerk",
        iot: "IoT-netwerk",
      };
      return `<section class="panel"><div class="section-head"><h3>${ico("wifi", 19)} WiFi-netwerken</h3></div><div class="wifi-list">${Object.keys(
        names,
      )
        .map((k) => {
          const e = d.wifi[k];
          return `<div class="wifi-row"><span>${ico("wifi", 18)}<span><b>${esc(names[k])}</b>${e.ssid ? `<small>${esc(e.ssid)}</small>` : ""}</span></span>${this._statusPill(e.on, "Aan", "Uit")}</div>`;
        })
        .join(
          "",
        )}</div><small class="hint">De hoofd-WiFi-sensor is standaard uitgeschakeld in de integratie. Ontbrekend = onbekend.</small></section>`;
    }
    _apiPanel(d) {
      const err = valid(d.lastError) ? String(d.lastError) : "—";
      return `<section class="panel api-panel"><div class="section-head"><h3>${ico("code-braces", 19)} Coordinator / API</h3><small>Optionele diagnose-entiteiten</small></div><div class="api-grid"><div><small>Deco laatste update</small><strong>${esc(timeLabel(d.decoUpdate))}</strong></div><div><small>Clients laatste update</small><strong>${esc(timeLabel(d.clientUpdate))}</strong></div><div><small>Deco responstijd</small><strong>${esc(duration(d.response))}</strong></div><div><small>Client responstijd</small><strong>${esc(duration(d.clientResponse))}</strong></div><div><small>Querymodus</small><strong>${esc(valid(d.queryMode) ? d.queryMode : "—")}</strong></div><div><small>Timeouts</small><strong>${esc(d.timeouts == null ? "—" : d.timeouts)}</strong></div><div class="error-text"><small>Laatste fout</small><strong title="${esc(err)}">${esc(err)}</strong></div><div><small>Polling</small><strong>${d.polling === true ? "Actief" : d.polling === false ? "Gepauzeerd" : "—"}</strong></div></div></section>`;
    }
    _trafficPanel(d) {
      const hours = this._historyPeriod();
      const showHistory =
        !this._isCompact() || this._config.compact_chart !== false;
      const controls = showHistory
        ? `<div class="chart-controls">${[1, 6, 24].map((h) => `<button type="button" data-action="hours" data-value="${h}" class="hour ${hours === h ? "active" : ""}" aria-pressed="${hours === h}">${h}u</button>`).join("")}</div>`
        : "";
      const loading =
        this._historyLoading &&
        !this._history.down.length &&
        !this._history.up.length;
      const history = showHistory
        ? `
        ${loading ? `<div class="empty-small">Historie laden…</div>` : trendSvg(this._history)}
        <div class="legend"><span class="teal-dot"></span> Download <span class="blue-dot"></span> Upload <span class="legend-note">Recorder · ${hours} uur</span></div>`
        : "";
      return `<section class="panel traffic-panel">
        <div class="section-head"><h3>${ico("chart-areaspline", 19)} Netwerkactiviteit</h3>${controls}</div>
        <div class="traffic-now"><span>${ico("arrow-down-bold", 15)} ${esc(field(d.down, " kB/s"))}</span><span>${ico("arrow-up-bold", 15)} ${esc(field(d.up, " kB/s"))}</span></div>
        ${history}
        <small class="hint">Dit is de som van door clients gerapporteerde doorvoer; geen internetsnelheidstest.</small>
      </section>`;
    }
    _sectionChoices() {
      return `<section class="widget-picker"><div class="section-head"><h3>${ico("view-dashboard-edit", 18)} Zichtbare onderdelen</h3><button type="button" data-action="all-sections" class="tiny-btn">Alles tonen</button></div><div class="choices">${Object.entries(
        SECTION_LABELS,
      )
        .map(
          ([id, label]) =>
            `<button type="button" data-action="toggle-section" data-section="${esc(id)}" aria-pressed="${this._sections().includes(id)}" class="choice ${this._sections().includes(id) ? "chosen" : ""}">${this._sections().includes(id) ? "✓" : "+"} ${esc(label)}</button>`,
        )
        .join(
          "",
        )}</div><small class="hint">Dit verandert de kaart tijdelijk. Voor blijvende instellingen gebruik je de kaarteditor of YAML.</small></section>`;
    }
    _render() {
      if (!this._hass) return;
      const d = this._data();
      const layout = this._layout();
      const sections = this._sections();
      const section = (id, body) => (sections.includes(id) ? body : "");
      const loaded = d.nodes.length > 0;
      if (loaded) this._ensureHistory(d);
      const topInfo = d.entries.multiple
        ? `<div class="notice">Meerdere TP-Link Deco-installaties gevonden. Momenteel wordt de eerste getoond. Stel <code>entry_id</code> in om de juiste mesh te kiezen.</div>`
        : "";
      const noData = `<div class="no-data">${ico("access-point-network-off", 36)}<b>Geen Deco-units gevonden</b><p>Controleer of ha-tplink-deco actief is en de device_tracker-entiteiten beschikbaar zijn. De kaart gebruikt de Deco-integratie via het entiteitenregister.</p><button type="button" data-action="retry">Opnieuw proberen</button>${this._regError ? `<small>${esc(this._regError)}</small>` : ""}</div>`;
      let body = noData;
      if (loaded) {
        const topology = section("topology", this._topology(d));
        const details = this._nodeDetails(d);
        const health = `<div class="health-strip">
          ${this._metric("CPU hoofd-Deco", field(d.master?.cpu, "%"), "chip")}
          ${this._metric("Geheugen", field(d.master?.memory, "%"), "memory")}
          ${this._metric("Backhaul", field(d.master?.backhaulSpeed, " Mbit/s"), "lan-connect")}
          ${this._metric("API responstijd", duration(d.response), "timer-outline")}
        </div>`;
        const traffic = section("traffic", this._trafficPanel(d));
        const wifi = section("wifi", this._wifiPanel(d));
        const nodes = section("nodes", this._nodesPanel(d));
        const clients = section("clients", this._clientsPanel(d));
        const api = section("api", this._apiPanel(d));
        const overview = topology + traffic + api;
        body =
          layout === "wide" && overview
            ? `<div class="mesh-columns">
              <div>${overview}</div>
              <div>${health}<div class="mesh-secondary">${wifi}${clients}</div>${nodes}${details}</div>
            </div>`
            : `${topology}${details}${health}<div class="lower-grid">${traffic}${wifi}${nodes}${clients}</div>${api}`;
      }
      const lastUpdate = Math.max(
        ...[d.decoUpdate, d.clientUpdate]
          .map((value) => Date.parse(value))
          .filter(Number.isFinite),
      );
      const updateLabel = Number.isFinite(lastUpdate)
        ? `Bijgewerkt ${timeLabel(lastUpdate)}`
        : "Update onbekend";
      const markup = `<style>${STYLE}</style><ha-card class="frame ${layout}"><div class="aura"></div><div class="header"><div class="logo">${ico("access-point-network", 27)}</div><div class="head-title"><h2>${esc(this._config.title || "TP-Link Deco")}</h2><p>Mesh netwerk live</p></div><div class="header-actions"><span class="update-mark">${ico("refresh", 14)} ${esc(updateLabel)}</span><button type="button" data-action="toggle-expand" aria-expanded="${this._expanded}" title="Zichtbare onderdelen kiezen">${ico("tune-variant", 18)}<span class="action-label"> Widgets</span></button></div></div>${topInfo}<div class="summary">${this._metric("Internet", d.internet === true ? "Online" : d.internet === false ? "Offline" : "Onbekend", "earth")}${this._metric("Verbonden clients", d.clientCount == null ? "—" : d.clientCount, "devices")}${this._metric("Download", field(d.down, " kB/s"), "arrow-down-bold")}${this._metric("Upload", field(d.up, " kB/s"), "arrow-up-bold")}</div>${this._expanded ? this._sectionChoices() : ""}${body}<div class="footer"><span>${this._statusPill(d.polling, "Polling actief", "Polling uit")}</span><span>ha-tplink-deco · Mesh Live</span></div></ha-card>`;
      if (this._lastMarkup !== markup) {
        this._lastMarkup = markup;
        const activeElement = this.shadowRoot.activeElement;
        const chartFocused = activeElement?.classList.contains("chart-plot");
        const clientToggleFocused =
          activeElement?.dataset.action === "toggle-clients";
        this.shadowRoot.innerHTML = markup;
        if (this._chartTime != null || chartFocused) {
          const plot = this.shadowRoot.querySelector(".chart-plot");
          if (plot && this._chartTime != null) this._updateChartReadout(plot);
          if (chartFocused) plot?.focus({ preventScroll: true });
        }
        if (clientToggleFocused)
          this.shadowRoot
            .querySelector('[data-action="toggle-clients"]')
            ?.focus({ preventScroll: true });
      }
    }
  }
  const STYLE = `
    :host {display:block;min-width:0;--teal:#34ead0;--blue:#62b6f8;color:#eaf6ff;font-family:Roboto,Arial,sans-serif;font-size:14px}
    *{box-sizing:border-box} button{font:inherit;cursor:pointer} ha-icon{display:inline-flex;align-items:center;justify-content:center;flex:none}
    .frame{position:relative;display:block;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 45% 0%,#0a3945 0%,transparent 48%),linear-gradient(146deg,#081c2b,#071322 58%,#0b2133)!important;color:#eaf6ff!important;border:1px solid rgba(65,221,218,.36);box-shadow:0 14px 42px #0005,inset 0 1px 0 #ffffff0e;border-radius:20px;min-width:0;padding:18px}
    .aura{position:absolute;inset:-100px -150px auto 5%;height:230px;background:radial-gradient(ellipse,#25d6b81b,transparent 70%);pointer-events:none;z-index:-1}
    .header,.header-actions,.summary,.metric,.section-head,.status,.topology-meta,.topology-note,.footer,.wifi-row,.wifi-row>span,.legend,.traffic-now,.detail-grid,.client-chips{display:flex;align-items:center;gap:9px}
    .header{margin-bottom:16px}.logo{height:42px;width:42px;display:grid;place-items:center;color:#72ffdc;background:linear-gradient(135deg,#0a706d,#113143);border:1px solid #55ead34e;border-radius:13px;box-shadow:0 0 25px #00bfa427}
    .head-title{flex:1;min-width:0}.head-title h2{font-size:21px;letter-spacing:-.4px;margin:0;line-height:1.25;color:#fff}.head-title p{margin:3px 0 0;color:#9fbdc6;font-size:12px}
    .header-actions{gap:10px}.header-actions button,.tiny-btn,.hour{display:inline-flex;align-items:center;justify-content:center;gap:5px;color:#d5eaff;border:1px solid #78cfdc44;background:#112f3c;border-radius:11px;padding:7px 10px;transition:background .2s}.header-actions button:hover,.tiny-btn:hover,.hour:hover{background:#174d57}
    .update-mark{display:flex;align-items:center;gap:4px;color:#add0d9;font-size:11px}.status i,.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#72939d;margin-right:4px}.status.ok i,.dot.on{background:#36ef9d;box-shadow:0 0 8px #36efa388}.status.bad i,.dot.off{background:#ff7b70}.status{gap:3px;font-size:11px;color:#afcdd5;white-space:nowrap}.status.ok{color:#5bf0b6}.status.bad{color:#ff988b}
    .summary,.health-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:13px;align-items:stretch}.metric{min-height:70px;padding:10px;background:linear-gradient(140deg,#102e3bda,#071d2bca);border:1px solid #5ac0ca2d;border-radius:13px;min-width:0}.metric-icon{height:32px;width:32px;color:#5ef3d2;display:grid;place-items:center;border-radius:50%;background:#0d535a63;flex:none}.metric div{min-width:0}.metric small{display:block;color:#9cbbc5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}.metric strong{display:block;color:#fff;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.metric .status{margin-top:4px}.metric strong:not(:last-child){margin-bottom:0}
    .topology{background:radial-gradient(ellipse at 50% 57%,#03635d21,transparent 45%),#04172340;border:1px solid #1e7f846e;border-radius:16px;margin:0 0 13px;overflow:hidden}.topology-meta{margin:13px 14px 0;color:#a7d5df;font-size:11px}.mesh-canvas{position:relative;height:370px;overflow:hidden;min-width:0}.mesh-canvas svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.mesh-canvas .link-path{fill:none;stroke:#36efdb;stroke-width:2.2;stroke-dasharray:8 8;opacity:.85;filter:drop-shadow(0 0 6px #32ffde80);animation:flow 8s linear infinite}.mesh-canvas .internet-path{fill:none;stroke:#36e2aa;stroke-width:2;stroke-dasharray:3 9;opacity:.45}.waves{position:absolute;inset:30% 0 0;background:radial-gradient(ellipse at 50% 70%,#02c9ab12,transparent 60%);pointer-events:none}.internet-node{position:absolute;top:1px;left:50%;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:4px;font-size:11px;background:#0b303d;border:1px solid #1f8086;border-radius:18px;padding:6px 10px;white-space:nowrap}.internet-node .status{margin-left:4px}
    .node{position:absolute;z-index:2;transform:translate(-50%,-50%);width:158px;min-height:106px;border:1px solid #1b8297;background:linear-gradient(155deg,#0b3445,#07232eeb);color:#f4ffff;border-radius:14px;padding:8px;box-shadow:0 0 20px #00d4be17;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px;outline:none}.node.root{width:181px;min-height:123px;border-color:#39eccd;box-shadow:0 0 31px #00efc34b;background:linear-gradient(145deg,#10525b,#042734)}.node.selected,.node:focus-visible{outline:2px solid #eaffff;outline-offset:2px}.node.offline{border-color:#d06c70;opacity:.85}.node b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;max-width:100%;font-size:13px;line-height:1.2}.node.root b{font-size:17px}.node-type{font-size:10px;color:#aad5de}.node-info{display:flex;justify-content:center;align-items:center;gap:5px}.node-info small{font-size:10px;color:#b4d5dd}.cylinder{display:block;position:relative;width:31px;height:30px;margin-top:-13px;border-radius:50% 50% 30% 30%/18% 18% 22% 22%;background:linear-gradient(90deg,#9db9c8,#fff 43%,#9cb9c8 95%);box-shadow:0 7px 19px #54fdcc30}.cylinder:before{content:"";position:absolute;left:0;right:0;top:0;height:10px;background:linear-gradient(90deg,#c2d4da,#f8ffff,#a2cad1);border-radius:50%}.root .cylinder{width:39px;height:36px}.topology-note{padding:9px 14px;color:#83adb8;font-size:10px;border-top:1px solid #144859}
    @keyframes flow{to{stroke-dashoffset:-80}}@media (prefers-reduced-motion:reduce){.mesh-canvas .link-path{animation:none}}
    .health-strip{margin:13px 0}.health-strip .metric{min-height:65px}
    .lower-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(235px,1fr);gap:12px;margin-bottom:12px}.panel,.detail-panel,.widget-picker{background:linear-gradient(155deg,#092c3c,#091c2d);border:1px solid #24697990;border-radius:14px;padding:13px;min-width:0}.panel h3,.detail-panel h3,.widget-picker h3{font-size:13px;margin:0;color:#e6ffff;display:flex;align-items:center;gap:7px}.section-head{justify-content:space-between;gap:8px;margin-bottom:12px}.section-head small,.hint{color:#83aab6;font-size:10px}.hint{display:block;margin-top:10px;line-height:1.5}
    .traffic-panel .section-head{flex-wrap:wrap}.chart-controls{display:flex;gap:4px}.hour{font-size:10px;padding:4px 8px;border-radius:7px}.hour.active{border-color:#36edcb;color:#59f6d5;background:#0a464a}.chart{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;margin:10px 0 6px;color:#a9c9d4;font-size:10px}
    .chart-unit{grid-column:1/-1}
    .chart-scale{display:flex;flex-direction:column;justify-content:space-between;text-align:right}
    .chart-plot{position:relative;min-width:0;cursor:crosshair;touch-action:pan-y}
    .chart-svg{display:block;width:100%;height:140px;overflow:visible}
    .chart-cursor{position:absolute;top:0;bottom:0;border-left:1px dashed #def5ff;pointer-events:none}
    .chart-times{grid-column:2;display:flex;justify-content:space-between;gap:6px}
    .chart-readout{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:3px 12px;min-height:1.4em;color:#e1f5fa;line-height:1.4}.grid-line{fill:none;stroke:#87cfd51c;stroke-width:1}.traffic-now{color:#cdf3f3;font-size:12px;gap:18px}.traffic-now span{display:flex;align-items:center;gap:4px}.legend{font-size:10px;color:#9fbeca;gap:6px}.teal-dot,.blue-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#21e8ca;margin-left:4px}.blue-dot{background:#71b8fd}.legend-note{margin-left:auto;color:#779caa}.empty-small{min-height:115px;display:grid;place-items:center;color:#88a9b6;font-size:12px;text-align:center}
    .wifi-list{display:flex;flex-direction:column;gap:5px}.wifi-row{justify-content:space-between;border-bottom:1px solid #2b71822d;padding:6px 0;gap:6px}.wifi-row>span{color:#60e4c9;gap:8px;min-width:0}.wifi-row>span span{display:flex;flex-direction:column;color:#e7f5fc;font-size:11px}.wifi-row small{font-size:10px;color:#7daaba}.wifi-row .status{font-size:10px}
    .node-table-head,.node-table-row{display:grid;grid-template-columns:minmax(90px,1.4fr) repeat(3,minmax(40px,.6fr)) minmax(75px,.9fr);align-items:center;gap:5px}.node-table-head{color:#7eaab4;font-size:10px;margin-bottom:8px}.node-table-row{width:100%;color:#e4f3fa;font-size:11px;background:transparent;border:0;border-top:1px solid #29808c20;text-align:left;padding:9px 0}.node-table-row:hover{background:#ffffff06}.name-cell{display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.node-table-row .dot{width:7px;height:7px;flex:none}.clients-big{font-size:30px;font-weight:750;color:#fff}.clients-big span{font-size:11px;font-weight:400;color:#a9c5cc}.bands{margin-top:13px;display:grid;gap:10px}.bands div{display:flex;align-items:center;gap:7px;font-size:12px}.bands ha-icon{color:#53eccb}.bands strong{margin-left:auto}.api-grid,.detail-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.api-grid>div,.detail-grid>div{min-width:0;padding-right:10px;border-right:1px solid #4a8e993d}.api-grid small,.detail-grid small{display:block;color:#91bbc4;font-size:10px}.api-grid strong,.detail-grid b{display:block;color:#fff;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:5px}.error-text{grid-column:span 1}.detail-panel{margin:0 0 13px}.detail-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.client-chips{flex-wrap:wrap;margin-top:14px}.client-chip{display:flex;align-items:center;gap:4px;background:#10404a;color:#afe8e7;padding:5px 7px;border-radius:7px;font-size:10px}
    .footer{justify-content:space-between;margin-top:12px;padding:10px 12px;border:1px solid #4b9ab53b;border-radius:12px;background:#0c344267;color:#aac4cf;font-size:11px;gap:10px;flex-wrap:wrap}.footer span{display:flex;align-items:center;gap:5px}.footer .status{font-size:11px}.footer ha-icon{color:#5ee6d5}
    .notice{background:#634c122a;border:1px solid #ffdb986b;padding:10px;border-radius:9px;font-size:12px;color:#ffdeb5;margin-bottom:12px}.notice code{font-family:monospace}.no-data{display:flex;align-items:center;flex-direction:column;text-align:center;gap:10px;padding:45px 18px;color:#a6cad2}.no-data>b{color:#fff}.no-data p{max-width:460px;line-height:1.6}.no-data button{border:1px solid #20cbb7;background:#0b5459;color:#e9fffd;border-radius:9px;padding:9px 14px}.widget-picker{margin-bottom:12px}.choices{display:flex;flex-wrap:wrap;gap:7px}.choice{border:1px solid #43838b;color:#9dc6cb;background:#071f2d;border-radius:8px;padding:6px 9px;font-size:11px}.choice.chosen{border-color:#2fe1be;color:#6ff4d6;background:#11534755}
    .compact{padding:13px;border-radius:16px}.compact .summary{grid-template-columns:repeat(2,minmax(0,1fr))}.compact .header-actions .action-label{display:none}.compact .update-mark{max-width:88px;font-size:10px}.compact .head-title h2{font-size:18px}.compact .metric{min-height:63px}.compact .health-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.compact .lower-grid{grid-template-columns:1fr}.compact .mesh-canvas{height:280px}.compact .node{width:103px;min-height:81px;padding:6px;gap:2px}.compact .node.root{width:114px;min-height:91px}.compact .node b,.compact .node.root b{font-size:11px}.compact .node-info{flex-wrap:wrap;gap:0}.compact .node-info small{display:none}.compact .cylinder,.compact .node.root .cylinder{width:26px;height:24px;margin-top:-9px}.compact .node-type{font-size:9px}.compact .topology-meta{font-size:10px}.compact .api-grid,.compact .detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.compact .topology-note{font-size:9px}.compact .panel{padding:12px}.compact .chart-svg{height:110px}
    .mesh-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;gap:12px}
    .mesh-columns>div{display:grid;gap:10px;min-width:0}
    .mesh-columns .topology,.mesh-columns .detail-panel,.mesh-columns .health-strip{margin:0}
    .mesh-columns .mesh-canvas{height:300px}
    .mesh-columns .node{min-height:85px}
    .mesh-columns .node.root{min-height:98px}
    .mesh-columns .chart-svg{height:108px}
    .mesh-columns .traffic-panel .empty-small{min-height:65px}
    .mesh-columns .health-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
    .mesh-columns .health-strip .metric{min-height:54px}
    .mesh-secondary{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(175px,100%),1fr));gap:10px}
    .mesh-secondary:empty{display:none}
    .node{width:min(158px,29%)}
    .node.root{width:min(181px,31%)}
    .compact .node{width:min(126px,29%)}
    .compact .node.root{width:min(142px,31%)}
    .node-table-head,.node-table-row{grid-template-columns:minmax(0,1.5fr) repeat(3,minmax(35px,.6fr)) minmax(49px,.85fr)}
    .node-table-row>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wifi-row small{overflow-wrap:anywhere}
    @media(max-width:700px){.expanded .summary,.expanded .health-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.expanded .lower-grid{grid-template-columns:1fr}.expanded .api-grid,.expanded .detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  class DecoMeshCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = {};
      this._entries = [];
      this._loaded = false;
      this.shadowRoot.addEventListener("change", (e) => this._change(e));
    }
    setConfig(config) {
      this._config = {
        ...config,
        sections: [...(config.sections || DEFAULT_SECTIONS)],
      };
      this._render();
    }
    set hass(hass) {
      if (this._hass === hass) return;
      this._hass = hass;
      this._loadEntries();
    }
    async _loadEntries() {
      if (this._loaded || !this._hass?.connection?.sendMessagePromise) return;
      this._loaded = true;
      try {
        const rows = await this._hass.connection.sendMessagePromise({
          type: "config/entity_registry/list",
        });
        this._entries = [
          ...new Set(
            rows
              .filter((e) => e.platform === "tplink_deco")
              .map((e) => e.config_entry_id)
              .filter(Boolean),
          ),
        ].sort();
      } catch (e) {}
      this._render();
    }
    _change(e) {
      const t = e.target;
      if (!t.name) return;
      const next = { ...this._config };
      if (t.dataset.section) {
        const set = new Set(next.sections || DEFAULT_SECTIONS);
        t.checked ? set.add(t.name) : set.delete(t.name);
        next.sections = DEFAULT_SECTIONS.filter((s) => set.has(s));
      } else if (t.name === "history_hours") next[t.name] = Number(t.value);
      else next[t.name] = t.value;
      this._config = next;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: next },
          bubbles: true,
          composed: true,
        }),
      );
    }
    _render() {
      if (!this.shadowRoot) return;
      const c = this._config,
        styles = `<style>:host{display:block} .editor{display:grid;gap:15px;padding:8px 0;font-family:Roboto,Arial,sans-serif}label{display:grid;gap:4px;font-size:13px}input,select{box-sizing:border-box;width:100%;padding:10px;border-radius:8px;border:1px solid var(--divider-color,#777);background:var(--card-background-color,#fff);color:var(--primary-text-color,#222)}.checks{display:grid;grid-template-columns:1fr 1fr;gap:9px}.checks label{display:flex;gap:7px;align-items:center}.checks input{width:auto}small{opacity:.75;font-size:11px}</style>`;
      this.shadowRoot.innerHTML = `${styles}<div class="editor"><label>Titel<input name="title" value="${esc(c.title || "TP-Link Deco")}"/></label><label>Formaat<select name="view">${Object.entries(
        VIEW_LABELS,
      )
        .map(
          ([view, label]) =>
            `<option value="${view}" ${c.view === view ? "selected" : ""}>${label}</option>`,
        )
        .join(
          "",
        )}</select></label><label>Mesh-installatie<select name="entry_id"><option value="">Automatisch (eerste installatie)</option>${this._entries.map((id) => `<option value="${esc(id)}" ${c.entry_id === id ? "selected" : ""}>${esc(id)}</option>`).join("")}</select></label><label>Grafiekvenster<select name="history_hours">${[1, 6, 24].map((h) => `<option value="${h}" ${Number(c.history_hours || 1) === h ? "selected" : ""}>${h} uur</option>`).join("")}</select></label><label>Zichtbare secties</label><div class="checks">${Object.entries(
        SECTION_LABELS,
      )
        .map(
          ([id, label]) =>
            `<label><input type="checkbox" data-section="true" name="${esc(id)}" ${c.sections?.includes(id) ? "checked" : ""}/> ${esc(label)}</label>`,
        )
        .join(
          "",
        )}</div><small>De diagnose-entiteiten zijn soms standaard uitgeschakeld. Schakel deze in onder Instellingen → Apparaten en diensten → TP-Link Deco → Entiteiten. WiFi-status verschilt per firmware.</small></div>`;
    }
  }
  if (!customElements.get(CARD_TYPE))
    customElements.define(CARD_TYPE, DecoMeshCard);
  if (!customElements.get(`${CARD_TYPE}-editor`))
    customElements.define(`${CARD_TYPE}-editor`, DecoMeshCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((x) => x.type === CARD_TYPE))
    window.customCards.push({
      type: CARD_TYPE,
      name: "TP-Link Deco Mesh Live",
      description:
        "Visuele mesh-topologie en netwerkdiagnostiek voor ha-tplink-deco",
      preview: true,
    });
  console.info(
    "%c TP-Link Deco Mesh Live card v1.3.0 ",
    "background:#008a80;color:white;",
  );
})();
