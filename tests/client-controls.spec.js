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
      options.phoneState ?? "not_home",
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
        tplink_deco: {
          ...(options.service === false ? {} : { set_client_blocked: {} }),
          ...(options.renameService ? { rename_client: {} } : {}),
        },
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
        if (options.pending) {
          await new Promise((resolve) => {
            globalThis.decoActions.finish = resolve;
          });
        }
        if (options.failure)
          throw {
            error: { message: "Router rejected the request <em>test</em>" },
          };
        if (options.unverified) return { response: {} };
        if (name === "rename_client")
          return { response: { name: data.name, changed: true } };
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

const renameButton = (page, name = "Test phone") =>
  panel(page).getByRole("button", { name: `Hernoemen: ${name}`, exact: true });
const renameDialog = (page) => card(page).getByRole("dialog");
const renameConfig = { client_rename: true };

for (const [name, options] of [
  ["default configuration", { config: {} }],
  [
    "an older integration with blocking only",
    {
      renameService: false,
      config: { ...renameConfig, client_controls: true },
    },
  ],
  ["non-admin users", { admin: false }],
  ["offline clients", { phoneState: "not_home" }],
  ["an unavailable registry", { registryDenied: true }],
  ["multiple meshes without an explicit entry", { multiple: true }],
  [
    "an unknown explicit entry",
    { config: { ...renameConfig, entry_id: "unknown" } },
  ],
]) {
  test(`hides renaming for ${name}`, async ({ page }) => {
    await setUp(page, {
      phoneState: "home",
      renameService: true,
      config: renameConfig,
      ...options,
    });
    await expect(
      card(page).getByRole("heading", { name: "ha-tplink-card" }),
    ).toBeVisible();
    await expect(
      panel(page).getByRole("button", { name: /^Hernoemen:/ }),
    ).toHaveCount(0);
    if (options.renameService === false)
      await expect(
        panel(page).getByRole("button", {
          name: "Blokkeren: Test phone",
          exact: true,
        }),
      ).toBeVisible();
    expect(await recordedCalls(page)).toEqual([]);
  });
}

test("saves the optional rename setting independently of blocking", async ({
  page,
}) => {
  await setUp(page, { renameService: true });
  await card(page).evaluate((element) => {
    const editor = element.constructor.getConfigElement();
    editor.setConfig({
      type: "custom:tplink-deco-mesh-card",
      client_controls: true,
    });
    editor.hass = globalThis.decoActions.hass;
    editor.addEventListener("config-changed", (event) => {
      globalThis.decoActions.editorConfig = event.detail.config;
    });
    element.ownerDocument.body.append(editor);
  });
  const editor = page.locator("tplink-deco-mesh-card-editor");
  const rename = editor.getByRole("checkbox", {
    name: "Deco-clients hernoemen toestaan",
  });
  await expect(rename).not.toBeChecked();
  await rename.check();
  expect(
    await page.evaluate(() => globalThis.decoActions.editorConfig),
  ).toMatchObject({ client_rename: true, client_controls: true });
});

test("confirms an exact 32-byte name and waits for the tracker update @screenshots", async ({
  page,
}) => {
  await setUp(page, {
    phoneState: "home",
    renameService: true,
    service: false,
    config: renameConfig,
    pending: true,
  });
  const name = "é".repeat(16);
  const dialog = renameDialog(page);
  const input = dialog.getByRole("textbox", { name: "Nieuwe naam" });
  const confirm = dialog.getByRole("button", { name: "Hernoemen bevestigen" });
  await expect(renameButton(page)).toBeVisible();
  await expect(panel(page).locator(".client-control-row")).toHaveCount(1);
  await expect(
    panel(page).getByRole("button", { name: /^Blokkeren:/ }),
  ).toHaveCount(0);
  await renameButton(page).click();
  await expect(input).toHaveValue("Test phone");
  if (process.env.UPDATE_SCREENSHOTS === "1") {
    await input.fill("Telefoon woonkamer");
    await dialog.screenshot({
      path: "docs/screenshots/client-rename.png",
      animations: "disabled",
    });
  }
  await input.fill(`${name}a`);
  await confirm.click();
  await expect(dialog.getByRole("alert")).toContainText("32 UTF-8-bytes");
  expect(await recordedCalls(page)).toEqual([]);
  await input.fill(name);
  await dialog.getByRole("button", { name: "Annuleren" }).click();
  await expect(dialog).toHaveCount(0);
  expect(await recordedCalls(page)).toEqual([]);

  await renameButton(page).click();
  await input.fill(name);
  await card(page).evaluate((element) => {
    const { hass } = globalThis.decoActions;
    hass.states["device_tracker.phone"].attributes.down_kilobytes_per_s = 100;
    element.hass = { ...hass };
  });
  await expect(input).toHaveValue(name);
  await confirm.click();
  await expect(confirm).toBeDisabled();
  expect(await recordedCalls(page)).toEqual([
    {
      domain: "tplink_deco",
      name: "rename_client",
      data: { config_entry_id: "entry-a", mac: "02:00:00:00:00:A1", name },
      notify: false,
      returnResponse: true,
    },
  ]);
  await page.evaluate(() => globalThis.decoActions.finish());
  await expect(dialog.getByRole("status")).toContainText("volgende update");
  await dialog.getByRole("button", { name: "Sluiten" }).click();
  await expect(renameButton(page)).toBeVisible();
  await expect(renameButton(page, name)).toHaveCount(0);
  await card(page).evaluate((element, name) => {
    const { hass } = globalThis.decoActions;
    hass.states["device_tracker.phone"].attributes.ui_device_name = name;
    element.hass = { ...hass };
  }, name);
  await expect(renameButton(page, name)).toHaveAttribute(
    "data-id",
    "device_tracker.phone",
  );
});

test("uses the selected mesh and rechecks eligibility at confirmation", async ({
  page,
}) => {
  await setUp(page, {
    phoneState: "home",
    renameService: true,
    multiple: true,
    config: { ...renameConfig, client_controls: true, entry_id: "entry-b" },
  });
  const tablet = renameButton(page, "Test tablet");
  const dialog = renameDialog(page);
  const confirm = dialog.getByRole("button", { name: "Hernoemen bevestigen" });
  await expect(tablet).toBeVisible();
  await expect(renameButton(page)).toHaveCount(0);
  await expect(
    panel(page).getByRole("button", {
      name: "Blokkeren: Test tablet",
      exact: true,
    }),
  ).toBeVisible();
  await tablet.click();
  await dialog.getByRole("textbox").fill("New tablet name");
  await confirm.click();
  await expect(dialog.getByRole("status")).toContainText(
    "Deco heeft de naam bevestigd",
  );
  expect((await recordedCalls(page))[0].data).toEqual({
    config_entry_id: "entry-b",
    mac: "02:00:00:00:00:B1",
    name: "New tablet name",
  });
  await dialog.getByRole("button", { name: "Sluiten" }).click();
  await tablet.click();
  await card(page).evaluate((element) => {
    const form = element.shadowRoot.querySelector(".client-rename-dialog form");
    const { hass } = globalThis.decoActions;
    hass.states["device_tracker.tablet"].state = "not_home";
    element.hass = { ...hass };
    form.requestSubmit();
  });
  await expect(dialog).toHaveCount(0);
  await expect(tablet).toHaveCount(0);
  expect(await recordedCalls(page)).toHaveLength(1);
});

test("shows the service error if the client disconnects during a rename", async ({
  page,
}) => {
  await setUp(page, {
    phoneState: "home",
    renameService: true,
    config: renameConfig,
    pending: true,
    failure: true,
  });
  await renameButton(page).click();
  const dialog = renameDialog(page);
  await dialog.getByRole("textbox").fill("New phone name");
  const confirm = dialog.getByRole("button", { name: "Hernoemen bevestigen" });
  await confirm.click();
  await expect(confirm).toBeDisabled();
  await card(page).evaluate((element) => {
    const { hass, finish } = globalThis.decoActions;
    hass.states["device_tracker.phone"].state = "not_home";
    element.hass = { ...hass };
    finish();
  });
  await expect(dialog.getByRole("alert")).toContainText("Router rejected");
  await dialog.getByRole("button", { name: "Annuleren" }).click();
  await expect(renameButton(page)).toHaveCount(0);
  expect(await recordedCalls(page)).toHaveLength(1);
});

for (const [options, reason] of [
  [{ failure: true }, "Router rejected the request <em>test</em>"],
  [{ unverified: true }, "Deco heeft de nieuwe naam niet bevestigd."],
]) {
  test(`reports rename failure: ${reason}`, async ({ page }) => {
    await setUp(page, {
      phoneState: "home",
      renameService: true,
      config: renameConfig,
      ...options,
    });
    await renameButton(page).click();
    const dialog = renameDialog(page);
    const input = dialog.getByRole("textbox");
    await input.fill("New phone name");
    await dialog.getByRole("button", { name: "Hernoemen bevestigen" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(
      `Hernoemen mislukt. ${reason}`,
    );
    await expect(dialog.getByRole("alert").locator("em")).toHaveCount(0);
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue("New phone name");
    await dialog.getByRole("button", { name: "Annuleren" }).click();
    await expect(renameButton(page)).toBeVisible();
    expect(await recordedCalls(page)).toHaveLength(1);
  });
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
