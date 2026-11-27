/* global document */
import { expect, test } from "@playwright/test";

const filename = "tplink-deco-mesh-card.js";
const communityModule = `/local/community/ha-tplink-card/${filename}`;
const card = (page) => page.locator("tplink-deco-mesh-card");

test("loads as a JavaScript module at the Marketplace resource path", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request));
  await page.route(`**/dist/${filename}`, (route) =>
    route.fulfill({ status: 302, headers: { location: communityModule } }),
  );
  const response = page.waitForResponse(
    (result) => new URL(result.url()).pathname === communityModule,
  );
  await page.goto("/demo/");
  expect((await response).headers()["content-type"]).toContain(
    "text/javascript",
  );
  await expect(card(page).locator(".node")).toHaveCount(4);
  expect(
    requests.every((request) =>
      ["http:", "data:"].includes(new URL(request.url()).protocol),
    ),
  ).toBe(true);
  expect(
    requests
      .filter((request) => request.url().startsWith("http:"))
      .every((request) => new URL(request.url()).hostname === "127.0.0.1"),
  ).toBe(true);
});

test("keeps missing states readable when registry or Recorder is unavailable", async ({
  page,
}) => {
  await page.goto("/demo/");
  await expect(card(page).locator(".node")).toHaveCount(4);
  await card(page).evaluate((element) => {
    const states = {
      "device_tracker.demo": {
        state: "home",
        attributes: { device_type: "deco", master: true },
      },
      "sensor.traffic": { state: "unavailable", attributes: {} },
    };
    element.setConfig({
      type: "custom:tplink-deco-mesh-card",
      entities: { down: "sensor.traffic" },
    });
    element.hass = {
      states,
      connection: {
        sendMessagePromise: async () => {
          throw new Error("Unavailable in fixture");
        },
      },
    };
  });
  await expect(card(page).locator(".node")).toHaveCount(1);
  await expect(
    card(page)
      .locator(".summary .metric")
      .filter({ hasText: "Download" })
      .locator("strong"),
  ).toHaveText("—");
  await expect(
    card(page).getByText("Geen Recorder-historie beschikbaar."),
  ).toBeVisible();
  await expect(card(page).getByText("Update onbekend")).toBeVisible();
});

test("uses the container width without a layout override", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/demo/");
  const mesh = card(page);
  const frame = mesh.locator("ha-card");
  const grid = await mesh.evaluate((element) => element.getGridOptions());
  expect(grid).toMatchObject({ columns: "full", rows: "auto" });

  for (const [width, layout] of [
    [400, "compact"],
    [650, "expanded"],
    [800, "wide"],
  ]) {
    await mesh.evaluate((element, size) => {
      element.style.width = size + "px";
    }, width);
    await expect(frame).toHaveClass(`frame ${layout}`);
  }
  await expect(mesh.locator(".mesh-columns")).toBeVisible();
  await mesh.evaluate((element) => {
    element.setConfig({
      type: "custom:tplink-deco-mesh-card",
      view: "expanded",
    });
  });
  await expect(frame).toHaveClass("frame expanded");
  await mesh.evaluate((element) => {
    element.setConfig({
      type: "custom:tplink-deco-mesh-card",
      view: "compact",
    });
  });
  await expect(frame).toHaveClass("frame compact");
});

test("editor emits Lovelace config changes", async ({ page }) => {
  await page.goto("/demo/");
  await expect(card(page).locator(".node")).toHaveCount(4);
  const view = await page.evaluate(async () => {
    const editor = document.createElement("tplink-deco-mesh-card-editor");
    document.body.append(editor);
    editor.setConfig({ view: "wide" });
    const result = new Promise((resolve) =>
      editor.addEventListener(
        "config-changed",
        (event) => resolve(event.detail.config.view),
        { once: true },
      ),
    );
    const select = editor.shadowRoot.querySelector('[name="view"]');
    select.value = "compact";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return result;
  });
  expect(view).toBe("compact");
});

test("labels mesh entries by main Deco and keeps the exact configured ID", async ({
  page,
}) => {
  await page.goto("/demo/");
  await expect(card(page).locator(".node")).toHaveCount(4);
  await page.evaluate(() => {
    const editor = document.createElement("tplink-deco-mesh-card-editor");
    document.body.append(editor);
    editor.setConfig({ entry_id: "saved-id" });
    const rows = ["home", "other", "guest"].map((key) => ({
      platform: "tplink_deco",
      config_entry_id: key + "-id",
      entity_id: "device_tracker." + key,
    }));
    const connection = { sendMessagePromise: async () => rows };
    const state = (name) => ({
      attributes: { device_type: "deco", master: true, friendly_name: name },
    });
    const states = {
      "device_tracker.home": state("Woonkamer"),
      "device_tracker.other": state("Kantoor"),
    };
    editor.hass = { states, connection };
    editor.addEventListener("config-changed", (e) => {
      editor.dataset.saved = e.detail.config.entry_id;
    });
  });
  const editor = page.locator("tplink-deco-mesh-card-editor").last();
  const meshPicker = editor.locator('select[name="entry_id"]');
  await expect(meshPicker.locator('option[value="home-id"]')).toHaveText(
    "Woonkamer",
  );
  await expect(meshPicker.locator('option[value="guest-id"]')).toHaveText(
    "guest-id",
  );
  await expect(meshPicker).toHaveValue("saved-id");
  await meshPicker.selectOption({ label: "Kantoor" });
  await expect(editor).toHaveAttribute("data-saved", "other-id");
  await editor.evaluate((element) => {
    const { _hass: hass } = element;
    const states = {
      ...hass.states,
      "device_tracker.guest": hass.states["device_tracker.home"],
    };
    element.hass = { ...hass, states };
  });
  await expect(meshPicker.locator('option[value="home-id"]')).toHaveText(
    "Woonkamer (home-id)",
  );
  await expect(meshPicker.locator('option[value="guest-id"]')).toHaveText(
    "Woonkamer (guest-id)",
  );
  await expect(meshPicker).toHaveValue("other-id");
});

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  test.describe(name, () => {
    test.use({
      viewport,
      hasTouch: name === "mobile",
      reducedMotion: "reduce",
    });
    test("lays out the dashboard, chart and details @screenshots", async ({
      page,
    }) => {
      await page.goto("/demo/");
      const mesh = card(page);
      const layout = name === "desktop" ? "wide" : "compact";
      await expect(mesh.locator("ha-card")).toHaveClass(`frame ${layout}`);
      if (name === "mobile") {
        const diagram = mesh.locator(".mesh-canvas-compact");
        await expect(diagram.locator(".node")).toHaveCount(4);
        await expect(diagram.locator(".link-path")).toHaveCount(3);
        const attic = diagram.locator(".node").filter({ hasText: "Zolder" });
        await expect(attic.locator(".node-type")).toHaveText("Ethernet");
        await expect(attic.locator(".node-info")).toContainText("Online");
        await expect(attic.locator(".node-info small")).toHaveText("4 clients");
        await expect(attic.locator(".node-info small")).toBeVisible();
      } else {
        await expect(mesh.locator(".mesh-canvas-compact")).toHaveCount(0);
        await expect(mesh.locator(".mesh-canvas .link-path")).toHaveCount(3);
      }
      await expect(mesh.locator(".chart-plot")).toBeVisible();
      await expect(mesh.locator(".chart-times span")).toHaveCount(3);
      await expect(mesh.locator(".chart-unit")).toHaveText("kB/s");
      await expect(
        mesh.locator(".bands").getByText(/Onbekend\/overig/),
      ).toBeVisible();
      const diagnostics = mesh.locator(".diagnostics");
      const diagnosticToggle = diagnostics.locator("summary");
      await expect(mesh.locator(".health-strip")).toContainText("6,1 s");
      await expect(diagnostics.locator(".api-panel")).not.toBeVisible();
      await expect(mesh.locator(".update-mark")).toContainText("Bijgewerkt");

      const plot = mesh.locator(".chart-plot");
      if (name === "mobile") await plot.tap();
      else await plot.hover();
      await expect(mesh.locator(".chart-readout")).toContainText(
        /Download [\d,.]+ kB\/s/,
      );
      await plot.press("Escape");
      await expect(mesh.locator(".chart-readout")).toHaveText("");
      await plot.press("ArrowRight");
      await expect(mesh.locator(".chart-readout")).toContainText(
        /Upload [\d,.]+ kB\/s/,
      );
      await mesh.locator('[data-action="hours"][data-value="24"]').click();
      await expect(mesh.locator(".legend-note")).toContainText("24 uur");

      if (process.env.UPDATE_SCREENSHOTS === "1") {
        await mesh.screenshot({
          path: `docs/screenshots/${name}.png`,
          animations: "disabled",
        });
      }

      const mainDeco = mesh.locator(".node.root");
      if (name === "mobile") await mainDeco.press("Enter");
      else await mainDeco.click();
      await expect(mainDeco).toHaveAttribute("aria-expanded", "true");
      if (name === "mobile") await expect(mainDeco).toBeFocused();
      const details = mesh.locator(".detail-panel");
      await expect(details).toBeVisible();
      const preceding = await details.evaluate(
        (element) => element.previousElementSibling.className,
      );
      expect(preceding).toBe(name === "desktop" ? "health-strip" : "topology");
      await details.getByRole("button", { name: "+2 meer" }).click();
      await expect(details.locator(".client-chip")).toHaveCount(14);
      await details.getByRole("button", { name: "Minder tonen" }).click();
      await expect(details.locator(".client-chip")).toHaveCount(12);
      await details.getByRole("button", { name: "Details sluiten" }).click();
      await expect(details).toHaveCount(0);
      await diagnosticToggle.press("Enter");
      await expect(diagnostics.locator(".api-panel")).toBeVisible();
      await diagnostics.locator(".node-table-row").first().click();
      await expect(details).toBeFocused();
      await expect(diagnostics.locator(".api-panel")).toBeVisible();
      await diagnosticToggle.click();
      await expect(diagnostics.locator(".api-panel")).not.toBeVisible();
    });
  });
}

test("draws only unambiguous reported Deco links", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/demo/");
  const mesh = card(page);
  await expect(mesh.locator(".link-path")).toHaveCount(3);
  await mesh.evaluate((element) => {
    const { _hass: hass } = element;
    const states = { ...hass.states };
    const update = (id, attrs) => {
      const state = states[`device_tracker.deco_${id}`];
      states[`device_tracker.deco_${id}`] = {
        ...state,
        attributes: { ...state.attributes, ...attrs },
      };
    };
    update("keuken", { deco_mac: null, deco_device: null });
    update("zolder", {
      deco_mac: "02:22:33:44:00:99",
      deco_device: "Woonkamer Deco",
    });
    update("slaapkamer", { deco_mac: null, deco_device: "Woonkamer Deco" });
    element.hass = { ...hass, states };
  });
  await expect(mesh.locator(".link-path")).toHaveCount(1);
  await expect(mesh.locator(".node-link-unknown")).toHaveText([
    "Gekoppelde Deco onbekend",
    "Gekoppelde Deco onbekend",
  ]);
  await expect(
    mesh.locator(".node").filter({ hasText: "Slaapkamer" }),
  ).not.toContainText("Gekoppelde Deco onbekend");
  await page.setViewportSize({ width: 320, height: 844 });
  const compact = mesh.locator(".mesh-canvas-compact");
  await expect(compact.locator(".link-path")).toHaveCount(1);
  await expect(compact.locator(".node-link-unknown")).toHaveCount(2);
  const { board, root, satellites } = await compact.evaluate((canvas) => ({
    board: canvas.getBoundingClientRect().toJSON(),
    root: canvas.querySelector(".node.root").getBoundingClientRect().toJSON(),
    satellites: Array.from(
      canvas.querySelectorAll(".node:not(.root)"),
      (node) => node.getBoundingClientRect().toJSON(),
    ),
  }));
  expect(root.bottom).toBeLessThan(satellites[0].top);
  expect(satellites[0].right).toBeLessThan(satellites[1].left);
  expect(satellites[0].bottom).toBeLessThan(satellites[2].top);
  for (const node of satellites) {
    expect(node.left).toBeGreaterThan(board.left);
    expect(node.right).toBeLessThan(board.right);
    expect(node.bottom).toBeLessThan(board.bottom);
  }
});
