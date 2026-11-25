import { expect, test } from "@playwright/test";

const card = (page) => page.locator("tplink-deco-mesh-card");
const dialog = (page) =>
  card(page).getByRole("dialog", { name: "Wi-Fi scan and optimization" });

async function setup(page, options = {}) {
  await page.goto("/demo/");
  await expect(card(page).locator(".node")).toHaveCount(4);
  await card(page).evaluate((element, options) => {
    const states = {};
    const registry = [];
    const add = (entry, device, id, unique, state, attributes = {}) => {
      registry.push({
        entity_id: id,
        unique_id: unique,
        config_entry_id: entry,
        device_id: device,
        platform: "tplink_deco",
      });
      states[id] = {
        state,
        attributes,
        last_updated: new Date(Date.now() - 5000).toISOString(),
      };
    };
    const mesh = (name, mac) => {
      const device = `device-${name}`;
      add(name, device, `device_tracker.${name}`, mac, "home", {
        device_type: "deco",
        master: true,
        friendly_name: name,
      });
      if (options.legacy) return;
      const sensorMac = mac.replaceAll(":", "-");
      add(
        name,
        device,
        `sensor.${name}_radio`,
        `${sensorMac}_wifi_channel_band2_4`,
        "6",
        {
          channel_width_mhz: 20,
        },
      );
      add(
        name,
        device,
        `sensor.${name}_bw`,
        `${sensorMac}_wifi_channel_width_band2_4`,
        "40",
      );
      add(
        name,
        device,
        `sensor.${name}_radio5`,
        `${sensorMac}_wifi_channel_band5`,
        "44",
        {
          channel_width_mhz: 80,
        },
      );
      add(
        name,
        device,
        `sensor.${name}_unused`,
        `${sensorMac}_wifi_channel_band6`,
        "unavailable",
      );
      if (options.channelsOnly) return;
      add(
        name,
        device,
        `sensor.${name}_result`,
        `${name}_wifi_optimization_advice`,
        "unknown",
      );
      add(name, device, `button.${name}_one`, `${name}_wifi_scan`, "unknown");
      add(
        name,
        device,
        `button.${name}_two`,
        `${name}_wifi_optimize`,
        "unknown",
      );
    };
    mesh("mesh_a", "02-00-00-00-00-A0");
    if (options.multiple) mesh("mesh_b", "02:00:00:00:00:B0");
    const calls = [];
    const manifestRequests = [];
    const hass = {
      language: "en",
      states,
      user: { id: "first-admin", is_admin: options.admin !== false },
      services: { button: { press: {} } },
      connection: {
        async sendMessagePromise(message) {
          if (message.type !== "manifest/get") return registry;
          manifestRequests.push(message);
          if (message.integration !== "tplink_deco")
            throw new Error("Wrong integration");
          if (options.manifestError) throw new Error("Manifest unavailable");
          return {
            domain: "tplink_deco",
            documentation:
              options.documentation ?? "https://github.com/dkwolf1/ha-deco",
            version:
              options.version === undefined ? "4.2.0-beta.1" : options.version,
          };
        },
      },
      async callService(domain, service, data, target) {
        calls.push({ domain, service, data, target });
        if (options.failure) throw new Error("Fixture failure");
        if (options.wait)
          await new Promise((resolve) => {
            globalThis.wifiFixture.finish = resolve;
          });
      },
    };
    const reads = [];
    if (options.report) {
      hass.callApi = async (method, path) => {
        reads.push({ method, path });
        if (path !== "states/sensor.mesh_a_bw") throw new Error("Unavailable");
        return {
          ...states["sensor.mesh_a_bw"],
          last_reported: new Date(Date.now() + 1000).toISOString(),
        };
      };
    }
    globalThis.wifiFixture = { hass, calls, reads, manifestRequests };
    element.setConfig({
      type: "custom:tplink-deco-mesh-card",
      ...(options.select ? { entry_id: options.select } : {}),
    });
    element.hass = hass;
  }, options);
  await expect(card(page).locator(".node")).toHaveCount(1);
}

async function update(page, id, state, attributes = {}, fresh = true) {
  await card(page).evaluate(
    (element, { id, state, attributes, fresh }) => {
      const { hass } = globalThis.wifiFixture;
      hass.states[id] = {
        ...hass.states[id],
        state,
        attributes,
        ...(fresh
          ? { last_updated: new Date(Date.now() + 50).toISOString() }
          : {}),
      };
      element.hass = { ...hass };
    },
    { id, state, attributes, fresh },
  );
}

const presses = (page) => page.evaluate(() => globalThis.wifiFixture.calls);

test("exposes the Wi-Fi popup only for a verified ha-deco version meeting the minimum", async ({
  page,
}) => {
  for (const [options, supported] of [
    [{ version: "4.1.3" }, false],
    [{ version: "4.2.0-alpha.9" }, false],
    [{ version: "4.2.0-beta.0" }, false],
    [{ version: "4.2.0-beta.1" }, true],
    [{ version: "4.2.0b2" }, true],
    [{ version: "4.2.0-rc.1" }, true],
    [{ version: "4.2.0" }, true],
    [{ version: "4.10.0" }, true],
    [{ version: null }, false],
    [{ version: "4.2-dev" }, false],
    [{ manifestError: true }, false],
    [
      {
        version: "5.0.0",
        documentation: "https://github.com/amosyuen/ha-tplink-deco",
      },
      false,
    ],
  ]) {
    await setup(page, options);
    const overview = card(page).locator(".wifi-channel-summary");
    await expect(overview).toContainText("Channel 6 · 40 MHz");
    expect(
      await page.evaluate(() => globalThis.wifiFixture.manifestRequests),
    ).toEqual([{ type: "manifest/get", integration: "tplink_deco" }]);
    await expect(
      card(page).getByRole("button", { name: "Wi-Fi scan and optimization" }),
    ).toHaveCount(supported ? 1 : 0);
    expect(await presses(page)).toEqual([]);
  }
});

test("shows live main Deco channels and names the monitor in all four languages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, { channelsOnly: true });
  const summary = card(page).locator(".wifi-channel-summary");
  for (const [language, heading, button, band, channel] of [
    [
      "en",
      "Current channels",
      "Wi-Fi scan and optimization",
      "2.4 GHz",
      "Channel",
    ],
    [
      "nl",
      "Huidige kanalen",
      "Wifi scannen en optimaliseren",
      "2,4 GHz",
      "Kanaal",
    ],
    ["de", "Aktuelle Kanäle", "WLAN-Scan und Optimierung", "2,4 GHz", "Kanal"],
    [
      "fr",
      "Canaux actuels",
      "Analyse et optimisation du Wi-Fi",
      "2,4 GHz",
      "Canal",
    ],
  ]) {
    await card(page).evaluate((element, language) => {
      const { hass } = globalThis.wifiFixture;
      hass.language = language;
      element.hass = { ...hass };
    }, language);
    await expect(summary.getByRole("heading", { name: heading })).toBeVisible();
    await expect(summary.locator('[data-band="band2_4"] dt')).toHaveText(band);
    await expect(summary.locator('[data-band="band2_4"] dd')).toHaveText(
      `${channel} 6 · 40 MHz`,
    );
    await expect(summary.locator('[data-band="band5"] dd')).toHaveText(
      `${channel} 44 · 80 MHz`,
    );
    await expect(summary.locator('[data-band="band6"]')).toHaveCount(0);
    const opener = card(page).getByRole("button", {
      name: button,
      exact: true,
    });
    await expect(opener).toBeVisible();
    const bounds = await opener.boundingBox();
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  }
  await update(page, "sensor.mesh_a_radio", "10", { channel_width_mhz: 40 });
  await expect(summary.locator('[data-band="band2_4"] dd')).toHaveText(
    "Canal 10 · 40 MHz",
  );
  expect(await presses(page)).toEqual([]);
});

test("scans once on request, reopens without a scan, and compares real readings after two optimization clicks", async ({
  page,
}, testInfo) => {
  await setup(page, { report: true });
  const opener = card(page).getByRole("button", {
    name: "Wi-Fi scan and optimization",
    exact: true,
  });
  await opener.focus();
  await opener.press("Enter");
  const popup = dialog(page);
  await expect(popup).toBeVisible();
  await expect(popup.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(popup.locator('[data-band="band2_4"] header')).toContainText(
    "Channel 6 · Width 40 MHz",
  );
  await expect(popup.locator('[data-band="band5"] header')).toContainText(
    "Channel 44 · Width 80 MHz",
  );
  await expect(popup.locator('[data-band="band6"]')).toHaveCount(0);
  expect(await presses(page)).toEqual([]);
  await popup.getByRole("button", { name: "Scan Wi-Fi", exact: true }).click();
  expect(await presses(page)).toEqual([
    {
      domain: "button",
      service: "press",
      data: {},
      target: { entity_id: "button.mesh_a_one" },
    },
  ]);
  await update(page, "sensor.mesh_a_result", "scanning");
  await expect(
    popup.locator(".wifi-advice").getByText("Deco is scanning"),
  ).toBeVisible();
  await expect(popup.locator(".wifi-sweep")).toHaveCount(2);
  if (process.env.REVIEW_WIFI_POPUP === "1")
    await popup.screenshot({
      path: testInfo.outputPath("wifi-desktop.png"),
      animations: "disabled",
    });
  await popup.getByRole("button", { name: "Close" }).press("Escape");
  await expect(popup).not.toBeVisible();
  const monitor = card(page).getByRole("button", {
    name: "Wi-Fi scan and optimization",
    exact: true,
  });
  await expect(monitor).toBeFocused();
  await monitor.click();
  expect(await presses(page)).toHaveLength(1);

  await update(page, "sensor.mesh_a_result", "optimizable", {
    outcome: "scan_not_observed",
    acknowledged: true,
  });
  await expect(
    popup
      .locator(".wifi-advice")
      .getByText("A completed scan was not observed.", { exact: false }),
  ).toBeVisible();
  await expect(
    popup.locator(".wifi-advice").getByText("Deco acknowledged the request."),
  ).toBeVisible();
  await expect(
    popup.locator(".wifi-advice").getByText("Deco reported a completed scan."),
  ).toHaveCount(0);
  await expect(popup.locator(".wifi-sweep")).toHaveCount(0);
  await popup
    .getByRole("button", { name: "Optimize Wi-Fi", exact: true })
    .click();
  expect(await presses(page)).toHaveLength(2);
  await expect(
    popup.getByRole("button", { name: "Confirm Wi-Fi optimization" }),
  ).toHaveCount(0);
  await update(page, "sensor.mesh_a_result", "confirm_optimization");
  await expect(
    popup
      .locator(".wifi-advice")
      .getByText("Wi-Fi may disconnect briefly.", { exact: false }),
  ).toBeVisible();
  expect(await presses(page)).toHaveLength(2);
  await popup
    .getByRole("button", { name: "Confirm Wi-Fi optimization" })
    .click();
  expect((await presses(page)).map(({ target }) => target.entity_id)).toEqual([
    "button.mesh_a_one",
    "button.mesh_a_two",
    "button.mesh_a_two",
  ]);
  await update(page, "sensor.mesh_a_result", "optimizing");
  await expect(
    popup.locator(".wifi-advice").getByText("Deco is optimizing"),
  ).toBeVisible();
  await expect(popup).toHaveAttribute("data-operation", "optimizing");
  await expect(popup.locator(".wifi-sweep")).toHaveCount(2);
  const sweep = popup.locator(".wifi-sweep").first();
  const position = () =>
    sweep.evaluate(
      (el) => el.ownerDocument.defaultView.getComputedStyle(el).transform,
    );
  const firstPosition = await position();
  await expect.poll(position).not.toBe(firstPosition);
  await update(page, "sensor.mesh_a_result", "optimal", {
    outcome: "advice_cleared",
  });
  await expect(popup.locator(".wifi-sweep")).toHaveCount(0);
  const band5 = popup.locator('[data-band="band5"]');
  await expect(
    band5.getByText("Unchanged in the last reported value"),
  ).toHaveCount(2);
  await expect(band5).toContainText("Before 44 · Last reported 44");
  await expect(band5).toContainText("Before 80 MHz · Last reported 80 MHz");
  await update(
    page,
    "sensor.mesh_a_radio",
    "10",
    { channel_width_mhz: 20 },
    false,
  );
  await expect(
    popup
      .locator('[data-band="band2_4"]')
      .getByText("No fresh value available"),
  ).toBeVisible();
  await expect(popup.getByText("6 → 10")).toHaveCount(0);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 70)));
  await update(page, "sensor.mesh_a_radio", "11", { channel_width_mhz: 20 });
  await expect(
    popup.locator('[data-band="band2_4"]').getByText("6 → 11"),
  ).toBeVisible();
  await expect(
    popup
      .locator('[data-band="band2_4"]')
      .getByText("Unchanged", { exact: true }),
  ).toBeVisible();
  await update(page, "sensor.mesh_a_radio5", "unavailable");
  await expect(band5.getByText("No fresh value available")).toHaveCount(2);
  expect(await presses(page)).toHaveLength(3);
  expect(await page.evaluate(() => globalThis.wifiFixture.reads)).toEqual([
    { method: "GET", path: "states/sensor.mesh_a_radio" },
    { method: "GET", path: "states/sensor.mesh_a_bw" },
    { method: "GET", path: "states/sensor.mesh_a_radio5" },
    { method: "GET", path: "states/sensor.mesh_a_unused" },
  ]);
});

test("keeps the compact dialog usable with reduced motion and reports button errors", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page, { failure: true });
  await card(page)
    .getByRole("button", { name: "Wi-Fi scan and optimization" })
    .click();
  await dialog(page).getByRole("button", { name: "Scan Wi-Fi" }).click();
  const popup = dialog(page);
  await expect(popup.getByRole("alert")).toContainText("Fixture failure");
  await update(page, "sensor.mesh_a_result", "scanning");
  await expect(
    popup.locator(".wifi-advice").getByText("Deco is scanning"),
  ).toBeVisible();
  await expect(popup.locator(".wifi-sweep").first()).toBeHidden();
  await update(page, "sensor.mesh_a_result", "optimizing");
  await expect(popup).toHaveAttribute("data-operation", "optimizing");
  await expect(popup.locator(".wifi-sweep").first()).toBeHidden();
  const box = await popup.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  if (process.env.REVIEW_WIFI_POPUP === "1")
    await popup.screenshot({
      path: testInfo.outputPath("wifi-mobile.png"),
      animations: "disabled",
    });
  await update(page, "sensor.mesh_a_result", "unavailable");
  await expect(
    popup.locator(".wifi-advice").getByText("Wi-Fi advice is unavailable."),
  ).toBeVisible();
  await popup.getByRole("button", { name: "Close" }).click();
  await expect(popup).not.toBeVisible();
});

test("limits detection and actions to the selected mesh and confirmation to the initiating administrator", async ({
  page,
}) => {
  await setup(page, { multiple: true });
  await expect(
    card(page).getByRole("button", { name: "Wi-Fi scan and optimization" }),
  ).toHaveCount(0);
  await setup(page, { multiple: true, select: "mesh_b" });
  await card(page)
    .getByRole("button", { name: "Wi-Fi scan and optimization" })
    .click();
  await dialog(page).getByRole("button", { name: "Scan Wi-Fi" }).click();
  await update(page, "sensor.mesh_b_result", "optimizable");
  await dialog(page)
    .getByRole("button", { name: "Optimize Wi-Fi", exact: true })
    .click();
  await update(page, "sensor.mesh_b_result", "confirm_optimization");
  await expect(
    dialog(page).getByRole("button", { name: "Confirm Wi-Fi optimization" }),
  ).toBeVisible();
  await card(page).evaluate((element) => {
    const { hass } = globalThis.wifiFixture;
    element.hass = { ...hass, user: { id: "second-admin", is_admin: true } };
  });
  await expect(dialog(page)).not.toBeVisible();
  await card(page)
    .getByRole("button", { name: "Wi-Fi scan and optimization" })
    .click();
  await expect(
    dialog(page).getByRole("button", { name: "Confirm Wi-Fi optimization" }),
  ).toHaveCount(0);
  expect((await presses(page)).map(({ target }) => target.entity_id)).toEqual([
    "button.mesh_b_one",
    "button.mesh_b_two",
  ]);
});

for (const options of [
  { legacy: true },
  { channelsOnly: true },
  { admin: false },
]) {
  test(`does not expose actions for ${Object.keys(options)[0]}`, async ({
    page,
  }) => {
    await setup(page, options);
    const monitor = card(page).getByRole("button", {
      name: "Wi-Fi scan and optimization",
    });
    await expect(
      card(page).getByRole("button", { name: "Scan Wi-Fi" }),
    ).toHaveCount(0);
    if (options.legacy) {
      await expect(monitor).toHaveCount(0);
    } else {
      await monitor.click();
      await expect(dialog(page).locator('[data-band="band2_4"]')).toBeVisible();
      await expect(
        dialog(page).getByRole("button", { name: /Scan|Optimize/ }),
      ).toHaveCount(0);
    }
    expect(await presses(page)).toEqual([]);
  });
}

test("expires the second click after 30 seconds without retrying", async ({
  page,
}) => {
  await page.clock.install();
  await setup(page);
  await update(page, "sensor.mesh_a_result", "optimizable");
  await card(page)
    .getByRole("button", { name: "Wi-Fi scan and optimization" })
    .click();
  const popup = dialog(page);
  await popup
    .getByRole("button", { name: "Optimize Wi-Fi", exact: true })
    .click();
  await update(page, "sensor.mesh_a_result", "confirm_optimization");
  const confirm = popup.getByRole("button", {
    name: "Confirm Wi-Fi optimization",
  });
  await expect(confirm).toBeVisible();
  await page.clock.fastForward(31000);
  await expect(confirm).toHaveCount(0);
  await expect(
    popup
      .locator(".wifi-advice")
      .getByText("The confirmation window has expired."),
  ).toBeVisible();
  expect(await presses(page)).toHaveLength(1);
});

test("opening the monitor during a pending request does not press the scan button again", async ({
  page,
}) => {
  await setup(page, { wait: true });
  await card(page)
    .getByRole("button", { name: "Wi-Fi scan and optimization" })
    .click();
  await dialog(page).getByRole("button", { name: "Scan Wi-Fi" }).click();
  await expect(
    dialog(page).getByRole("button", { name: "Scan Wi-Fi" }),
  ).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Close" }).click();
  await card(page)
    .getByRole("button", { name: "Wi-Fi scan and optimization" })
    .click();
  await expect(
    dialog(page).getByRole("button", { name: "Scan Wi-Fi" }),
  ).toBeDisabled();
  expect(await presses(page)).toHaveLength(1);
  await page.evaluate(() => globalThis.wifiFixture.finish());
  await update(page, "sensor.mesh_a_result", "optimal", {
    outcome: "scan_observed",
  });
  await expect(
    dialog(page)
      .locator(".wifi-advice")
      .getByText("Deco reported a completed scan."),
  ).toBeVisible();
  expect(await presses(page)).toHaveLength(1);
});

test("animates a scan without readings and shows reported channels when the verdict is already optimal", async ({
  page,
}) => {
  await setup(page);
  await update(page, "sensor.mesh_a_radio", "unavailable");
  await update(page, "sensor.mesh_a_bw", "unavailable");
  await update(page, "sensor.mesh_a_radio5", "unavailable");
  await expect(card(page).locator(".wifi-monitor-links button")).toHaveCount(1);
  await card(page)
    .getByRole("button", { name: "Wi-Fi scan and optimization" })
    .click();
  const popup = dialog(page);
  expect(await presses(page)).toHaveLength(0);
  await popup.getByRole("button", { name: "Scan Wi-Fi" }).click();
  await update(page, "sensor.mesh_a_result", "scanning");
  const sweep = popup.locator(".wifi-scan-placeholder .wifi-sweep");
  await expect(sweep).toBeVisible();
  const transform = await sweep.evaluate(
    (el) => el.ownerDocument.defaultView.getComputedStyle(el).transform,
  );
  await expect
    .poll(() =>
      sweep.evaluate(
        (el) => el.ownerDocument.defaultView.getComputedStyle(el).transform,
      ),
    )
    .not.toBe(transform);
  await update(page, "sensor.mesh_a_radio", "2", { channel_width_mhz: 40 });
  await update(page, "sensor.mesh_a_radio5", "44", { channel_width_mhz: 80 });
  await update(page, "sensor.mesh_a_result", "optimal", {
    outcome: "scan_not_observed",
    acknowledged: true,
  });
  await expect(popup.locator('[data-band="band2_4"] header')).toContainText(
    "Channel 2 · Width 40 MHz",
  );
  await expect(popup.locator('[data-band="band5"] header')).toContainText(
    "Channel 44 · Width 80 MHz",
  );
  await expect(
    popup.getByRole("button", { name: "Optimize Wi-Fi" }),
  ).toHaveCount(0);
  await expect(popup.locator(".wifi-sweep")).toHaveCount(0);
  expect(await presses(page)).toHaveLength(1);
});
