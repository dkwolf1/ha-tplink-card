import { expect, test } from "@playwright/test";

const card = (page) => page.locator("tplink-deco-mesh-card");
const panel = (page) => card(page).locator(".client-controls");

async function setUp(page, options = {}) {
  await page.goto("/demo/");
  await expect(card(page).locator(".node")).toHaveCount(4);
  await card(page).evaluate((element, options) => {
    const registry = [];
    const states = {};
    function add(name, entry, type, uniqueId, attrs = {}, state = "home") {
      const id = `device_tracker.${name}`;
      registry.push({
        entity_id: id,
        platform: "tplink_deco",
        config_entry_id: entry,
        unique_id: uniqueId,
      });
      states[id] = { state, attributes: { device_type: type, ...attrs } };
    }
    add("mesh_a", "entry-a", "deco", "02:00:00:00:00:A0", { master: true });
    add(
      "phone",
      "entry-a",
      "client",
      "02:00:00:00:00:A1",
      {
        ui_device_name: "Test phone",
        deco_mac: "02:00:00:00:00:A0",
      },
      "not_home",
    );
    add("bad_mac", "entry-a", "client", "not-a-mac", {
      ui_device_name: "Bad MAC",
      deco_mac: "02:00:00:00:00:A0",
    });
    add("conflict", "entry-a", "client", "02:00:00:00:00:A2", {
      ui_device_name: "Conflicting MAC",
      mac: "02:00:00:00:00:A3",
    });
    if (options.multiple) {
      add("mesh_b", "entry-b", "deco", "02:00:00:00:00:B0", { master: true });
      add("tablet", "entry-b", "client", "02:00:00:00:00:B1", {
        ui_device_name: "Test tablet",
        mac: "02-00-00-00-00-b1",
      });
    }
    const calls = [];
    const hass = {
      states,
      user: { is_admin: options.admin !== false },
      services: {
        tplink_deco:
          options.service === false ? {} : { set_client_blocked: {} },
      },
      connection: {
        sendMessagePromise: async ({ type }) => {
          if (type !== "config/entity_registry/list") return {};
          if (options.registryDenied) throw new Error("Registry unavailable");
          return registry;
        },
      },
      async callService(domain, name, data, target, notify, returnResponse) {
        calls.push({ domain, name, data, target, notify, returnResponse });
        if (options.failure)
          throw {
            error: { message: "Router rejected the request <em>test</em>" },
          };
        if (options.unverified) return { response: {} };
        if (options.pending) {
          await new Promise((resolve) => {
            globalThis.decoActions.finish = resolve;
          });
        }
        return { response: { blocked: data.blocked, changed: false } };
      },
    };
    globalThis.decoActions = { calls, hass, registry };
    element.setConfig({
      type: "custom:tplink-deco-mesh-card",
      ...options.config,
    });
    element.hass = hass;
  }, options);
}

async function recordedCalls(page) {
  return page.evaluate(() => globalThis.decoActions.calls);
}

for (const [name, options] of [
  ["default read-only configuration", {}],
  ["older integrations", { service: false, config: { client_controls: true } }],
  ["non-admin users", { admin: false, config: { client_controls: true } }],
  [
    "an unavailable registry",
    { registryDenied: true, config: { client_controls: true } },
  ],
  [
    "multiple meshes without an explicit entry",
    { multiple: true, config: { client_controls: true } },
  ],
]) {
  test(`hides client controls for ${name}`, async ({ page }) => {
    await setUp(page, options);
    await expect(
      card(page).locator(".node").filter({ hasText: "mesh a" }),
    ).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
    expect(await recordedCalls(page)).toEqual([]);
  });
}

test("confirms blocking and allows unblocking a known offline tracker", async ({
  page,
}) => {
  await setUp(page, { config: { client_controls: true }, pending: true });
  const block = panel(page).getByRole("button", {
    name: "Blokkeren: Test phone",
    exact: true,
  });
  const unblock = panel(page).getByRole("button", {
    name: "Deblokkeren: Test phone",
    exact: true,
  });
  await expect(block).toBeVisible();
  await expect(panel(page).locator(".client-control-row")).toHaveCount(1);
  await expect(panel(page).locator(".client-control-feedback")).toHaveText("");

  const dismissed = page.waitForEvent("dialog").then(async (dialog) => {
    expect(dialog.message()).toContain("Test phone blokkeren?");
    await dialog.dismiss();
  });
  await block.click();
  await dismissed;
  expect(await recordedCalls(page)).toEqual([]);

  const accepted = page
    .waitForEvent("dialog")
    .then((dialog) => dialog.accept());
  await block.click();
  await accepted;
  await expect(block).toBeDisabled();
  await expect(unblock).toBeDisabled();
  expect(await recordedCalls(page)).toEqual([
    {
      domain: "tplink_deco",
      name: "set_client_blocked",
      data: {
        config_entry_id: "entry-a",
        mac: "02:00:00:00:00:A1",
        blocked: true,
      },
      notify: false,
      returnResponse: true,
    },
  ]);
  await page.evaluate(() => globalThis.decoActions.finish());
  await expect(panel(page).getByRole("status")).toHaveText(
    "Deco bevestigt: geblokkeerd.",
  );
  await unblock.click();
  await expect(unblock).toBeDisabled();
  await page.evaluate(() => globalThis.decoActions.finish());
  await expect(panel(page).getByRole("status")).toHaveText(
    "Deco bevestigt: gedeblokkeerd.",
  );
  expect((await recordedCalls(page))[1].data.blocked).toBe(false);
});

test("passes an explicit entry and never acts on clients from the other mesh", async ({
  page,
}) => {
  await setUp(page, {
    multiple: true,
    config: { client_controls: true, entry_id: "entry-b" },
  });
  const unblock = panel(page).getByRole("button", {
    name: "Deblokkeren: Test tablet",
    exact: true,
  });
  await expect(unblock).toBeVisible();
  await expect(panel(page)).not.toContainText("Test phone");
  await unblock.click();
  await expect(panel(page).getByRole("status")).toHaveText(
    "Deco bevestigt: gedeblokkeerd.",
  );
  expect((await recordedCalls(page))[0].data).toEqual({
    config_entry_id: "entry-b",
    mac: "02:00:00:00:00:B1",
    blocked: false,
  });
  await card(page).evaluate((element) => {
    const stale = element.shadowRoot.querySelector(
      '[data-action="unblock-client"]',
    );
    element.setConfig({
      type: "custom:tplink-deco-mesh-card",
      client_controls: true,
      entry_id: "entry-a",
    });
    stale.click();
  });
  expect(await recordedCalls(page)).toHaveLength(1);
  await expect(panel(page)).toContainText("Test phone");
});

for (const [options, message] of [
  [
    { failure: true },
    "Actie mislukt. Router rejected the request <em>test</em>",
  ],
  [
    { unverified: true },
    "Actie mislukt. Deco heeft de gevraagde blokkeerstatus niet bevestigd.",
  ],
]) {
  test(`reports ${options.failure ? "a rejected action" : "a missing confirmation"}`, async ({
    page,
  }) => {
    await setUp(page, { ...options, config: { client_controls: true } });
    const unblock = panel(page).getByRole("button", {
      name: "Deblokkeren: Test phone",
      exact: true,
    });
    await unblock.click();
    await expect(panel(page).getByRole("alert")).toHaveText(message);
    await expect(panel(page).getByRole("alert").locator("em")).toHaveCount(0);
    await expect(unblock).toBeEnabled();
    expect(await recordedCalls(page)).toHaveLength(1);
  });
}
