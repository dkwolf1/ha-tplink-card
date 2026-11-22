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
      await expect(mesh.locator(".chart-plot")).toBeVisible();
      await expect(mesh.locator(".chart-times span")).toHaveCount(3);
      await expect(mesh.locator(".chart-unit")).toHaveText("kB/s");
      await expect(
        mesh.locator(".bands").getByText(/Onbekend\/overig/),
      ).toBeVisible();
      await expect(mesh.locator(".api-panel")).toContainText("6,1 s");
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

      await mesh.locator(".node.root").click();
      const details = mesh.locator(".detail-panel");
      await expect(details).toBeVisible();
      const preceding = await details.evaluate(
        (element) => element.previousElementSibling.className,
      );
      expect(preceding).toBe(name === "desktop" ? "panel" : "topology");
      await details.getByRole("button", { name: "+2 meer" }).click();
      await expect(details.locator(".client-chip")).toHaveCount(14);
      await details.getByRole("button", { name: "Minder tonen" }).click();
      await expect(details.locator(".client-chip")).toHaveCount(12);
      await details.getByRole("button", { name: "Details sluiten" }).click();
      await expect(details).toHaveCount(0);
    });
  });
}
