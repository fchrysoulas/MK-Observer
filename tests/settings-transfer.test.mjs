import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, mock, test } from "node:test";
import { MODULE_ID, MODULE_VERSION, SETTINGS } from "../scripts/constants.js";

const english = JSON.parse(await readFile(new URL("../lang/en.json", import.meta.url), "utf8"));
const translate = (key) => key.split(".").reduce((value, part) => value?.[part], english) ?? key;

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (Base) => Base,
      DialogV2: { confirm: async () => true }
    }
  }
};

const { exportSettings, importSettings, SettingsTransfer, validateSettingsImport } = await import("../scripts/settings-transfer.js");
const { registerSettings } = await import("../scripts/settings.js");

let values;
let writes;
let hooks;
let menus;

beforeEach(() => {
  values = new Map();
  writes = [];
  hooks = [];
  menus = new Map();
  const definitions = new Map();
  const users = [{ id: "observer", name: "Observer", isGM: false }, { id: "gm", name: "GM", isGM: true }];
  globalThis.Hooks = { callAll: (...args) => hooks.push(args) };
  globalThis.game = {
    user: { isGM: true },
    users: { contents: users, get: (id) => users.find((user) => user.id === id) },
    modules: new Map([[MODULE_ID, { version: MODULE_VERSION }]]),
    i18n: {
      localize: translate,
      format: (key, data) => translate(key).replace(/\{(\w+)\}/g, (_match, name) => data[name])
    },
    settings: {
      settings: definitions,
      register: (namespace, key, config) => {
        assert.equal(namespace, MODULE_ID);
        definitions.set(`${namespace}.${key}`, config);
        values.set(key, config.default);
      },
      registerMenu: (namespace, key, config) => {
        assert.equal(namespace, MODULE_ID);
        menus.set(key, config);
      },
      get: (namespace, key) => {
        assert.equal(namespace, MODULE_ID);
        assert.ok(values.has(key), `Unregistered setting: ${key}`);
        return values.get(key);
      },
      set: async (namespace, key, value) => {
        assert.equal(namespace, MODULE_ID);
        writes.push([key, value]);
        values.set(key, value);
        definitions.get(`${namespace}.${key}`)?.onChange?.(value);
        return value;
      },
      sheet: { render: mock.fn() }
    }
  };
  globalThis.ui = { notifications: { info: mock.fn(), warn: mock.fn(), error: mock.fn() } };
  mock.method(foundry.applications.api.DialogV2, "confirm", async () => true);
  mock.method(console, "error", () => {});
  registerSettings();
});

afterEach(() => mock.restoreAll());

function backup(settings) {
  return JSON.stringify({ module: MODULE_ID, schemaVersion: 1, settings });
}

function importWindow(json) {
  const input = { files: json === undefined ? [] : [{ text: async () => json }], value: "backup.json" };
  const buttons = [{ disabled: false }, { disabled: false }];
  const app = {
    element: {
      querySelector: () => input,
      querySelectorAll: () => buttons
    }
  };
  return {
    app, input, buttons,
    run: () => SettingsTransfer.DEFAULT_OPTIONS.actions.importSettings.call(app)
  };
}

test("registers a GM-only settings menu", () => {
  assert.equal(menus.get("settingsTransfer").restricted, true);
  assert.equal(menus.get("settingsTransfer").type, SettingsTransfer);
});

test("the export control downloads a JSON backup and releases its temporary URL", async () => {
  let blob;
  let cleanup;
  mock.method(URL, "createObjectURL", (value) => { blob = value; return "blob:settings-backup"; });
  mock.method(URL, "revokeObjectURL", () => {});
  mock.method(globalThis, "setTimeout", (callback) => { cleanup = callback; return 0; });
  const link = { click: mock.fn() };
  globalThis.document = { createElement: (tag) => { assert.equal(tag, "a"); return link; } };
  try {
    SettingsTransfer.DEFAULT_OPTIONS.actions.exportSettings();
    assert.equal(blob.type, "application/json");
    assert.equal(link.href, "blob:settings-backup");
    assert.match(link.download, /^mk-observer-settings-\d{4}-\d{2}-\d{2}\.json$/);
    assert.equal(link.click.mock.callCount(), 1);
    const downloaded = JSON.parse(await blob.text());
    assert.deepEqual(downloaded.settings, exportSettings().settings);
    validateSettingsImport(JSON.stringify(downloaded));
    cleanup();
    assert.equal(URL.revokeObjectURL.mock.calls[0].arguments[0], "blob:settings-backup");
  } finally {
    delete globalThis.document;
  }
});

test("exports and restores all saved module settings with metadata and hooks", async () => {
  values.set(SETTINGS.OBSERVER_USER_ID, "observer");
  values.set(SETTINGS.CAMERA_MODE, "directed");
  values.set(SETTINGS.SCENE_MARGIN_LEFT, -125);
  values.set(SETTINGS.CHAT_MODE, "detached");
  values.set(SETTINGS.CHAT_NOTIFICATION_OFFSET_X, 27);
  const saved = exportSettings();
  assert.equal(saved.module, MODULE_ID);
  assert.equal(saved.schemaVersion, 1);
  assert.equal(saved.moduleVersion, MODULE_VERSION);
  assert.ok(Number.isFinite(Date.parse(saved.exportedAt)));
  assert.deepEqual(Object.keys(saved.settings).sort(), Object.values(SETTINGS).sort());
  const expected = new Map(values);
  for (const [key, config] of game.settings.settings) values.set(key.slice(MODULE_ID.length + 1), config.default);
  const result = await importSettings(JSON.stringify(saved));
  assert.equal(result.count, 5);
  assert.equal(result.observerSkipped, false);
  assert.deepEqual(values, expected);
  assert.ok(hooks.some(([name, value]) => name === `${MODULE_ID}.cameraModeChanged` && value === "directed"));
  assert.ok(hooks.some(([name]) => name === `${MODULE_ID}.sceneBoundsChanged`));
});

test("default settings round-trip, including defaults between slider steps", async () => {
  const json = JSON.stringify(exportSettings());
  validateSettingsImport(json);
  assert.equal((await importSettings(json)).count, 0);
  assert.deepEqual(writes, []);
});

test("partial backups preserve settings absent from the file", async () => {
  values.set(SETTINGS.CHAT_MODE, "popout");
  await importSettings(backup({ cameraMode: "disabled" }));
  assert.deepEqual(writes, [[SETTINGS.CAMERA_MODE, "disabled"]]);
  assert.equal(values.get(SETTINGS.CHAT_MODE), "popout");
});

test("rejects malformed, foreign, empty, and unsupported backup files before writing", async () => {
  const invalid = [
    "{", "null", "[]", "{}",
    JSON.stringify({ module: "another-module", schemaVersion: 1, settings: { cameraMode: "disabled" } }),
    JSON.stringify({ module: MODULE_ID, schemaVersion: 2, settings: { cameraMode: "disabled" } }),
    JSON.stringify({ module: MODULE_ID, schemaVersion: 1, settings: [] }),
    backup({})
  ];
  for (const json of invalid) await assert.rejects(importSettings(json));
  assert.deepEqual(writes, []);
});

test("validates the entire file before writing any setting", async () => {
  const invalid = [
    { cameraMode: "directed", unknown: true },
    { cameraMode: "directed", showSidebar: "false" },
    { cameraMode: "directed", chatWidth: "500" },
    { cameraMode: "directed", chatWidth: null },
    { cameraMode: "directed", chatWidth: 279 },
    { cameraMode: "directed", sceneMarginLeft: -501 },
    { cameraMode: "directed", sceneMarginRight: 501 },
    { cameraMode: "directed", maximumPanSpeed: 4001 },
    { cameraMode: "directed", chatMode: "unknown" },
    { cameraMode: "directed", chatNotificationAnchor: "unknown" },
    { cameraMode: "directed", observerUserId: 123 },
    { cameraMode: "directed", minimumScale: 2, maximumScale: 1 },
    { cameraMode: "directed", maximumScale: 0.1 }
  ];
  for (const settings of invalid) await assert.rejects(importSettings(backup(settings)));
  await assert.rejects(importSettings('{"module":"mk-observer","schemaVersion":1,"settings":{"cameraMode":"directed","chatWidth":1e309}}'));
  await assert.rejects(importSettings('{"module":"mk-observer","schemaVersion":1,"settings":{"__proto__":{"polluted":true}}}'));
  assert.deepEqual(writes, []);
  assert.equal({}.polluted, undefined);
});

test("keeps the current Observer User when the saved user is missing or is a GM", async () => {
  values.set(SETTINGS.OBSERVER_USER_ID, "observer");
  for (const id of ["from-another-world", "gm"]) {
    const result = await importSettings(backup({ observerUserId: id, cameraMode: "directed" }));
    assert.equal(result.observerSkipped, true);
    assert.equal(values.get(SETTINGS.OBSERVER_USER_ID), "observer");
    assert.equal(values.get(SETTINGS.CAMERA_MODE), "directed");
  }
  await importSettings(backup({ observerUserId: "" }));
  assert.equal(values.get(SETTINGS.OBSERVER_USER_ID), "");
});

test("non-GMs cannot export, validate, or import settings", async () => {
  game.user.isGM = false;
  assert.throws(exportSettings, /Only a GM/);
  assert.throws(() => validateSettingsImport(backup({ cameraMode: "directed" })), /Only a GM/);
  await assert.rejects(importSettings(backup({ cameraMode: "directed" })), /Only a GM/);
  assert.deepEqual(writes, []);
});

test("restores earlier settings when a later save fails", async () => {
  const original = game.settings.set;
  mock.method(game.settings, "set", async (namespace, key, value) => {
    if (key === SETTINGS.CHAT_WIDTH) throw new Error("Save rejected");
    return original(namespace, key, value);
  });
  await assert.rejects(importSettings(backup({ cameraMode: "directed", chatWidth: 500 })), /Previous settings were restored/);
  assert.equal(values.get(SETTINGS.CAMERA_MODE), "automatic");
  assert.equal(values.get(SETTINGS.CHAT_WIDTH), 380);
});

test("also restores a setting that persisted before its save rejected", async () => {
  const original = game.settings.set;
  mock.method(game.settings, "set", async (namespace, key, value) => {
    await original(namespace, key, value);
    if (key === SETTINGS.CHAT_WIDTH && value === 500) throw new Error("Post-save failure");
    return value;
  });
  await assert.rejects(importSettings(backup({ cameraMode: "directed", chatWidth: 500 })), /Previous settings were restored/);
  assert.equal(values.get(SETTINGS.CAMERA_MODE), "automatic");
  assert.equal(values.get(SETTINGS.CHAT_WIDTH), 380);
});

test("reports incomplete rollback instead of claiming success", async () => {
  const original = game.settings.set;
  mock.method(game.settings, "set", async (namespace, key, value) => {
    if (key === SETTINGS.CHAT_WIDTH || value === "automatic") throw new Error("Connection lost");
    return original(namespace, key, value);
  });
  await assert.rejects(importSettings(backup({ cameraMode: "directed", chatWidth: 500 })), /some settings could not be restored/);
  assert.equal(values.get(SETTINGS.CAMERA_MODE), "directed");
});

test("the import control requires a file and leaves settings untouched on cancel", async () => {
  const missing = importWindow();
  await missing.run();
  assert.equal(ui.notifications.warn.mock.callCount(), 1);
  assert.equal(foundry.applications.api.DialogV2.confirm.mock.callCount(), 0);
  mock.method(foundry.applications.api.DialogV2, "confirm", async () => false);
  const cancelled = importWindow(backup({ cameraMode: "directed" }));
  await cancelled.run();
  assert.deepEqual(writes, []);
  assert.ok(cancelled.buttons.every((button) => !button.disabled));
  assert.equal(cancelled.input.value, "backup.json");
});

test("the import control reports validation errors before showing confirmation", async () => {
  const window = importWindow(backup({ showSidebar: "false" }));
  await window.run();
  assert.equal(foundry.applications.api.DialogV2.confirm.mock.callCount(), 0);
  assert.equal(ui.notifications.error.mock.callCount(), 1);
  assert.deepEqual(writes, []);
  assert.ok(window.buttons.every((button) => !button.disabled));
});

test("unreadable files do not open confirmation or change settings", async () => {
  const window = importWindow(backup({ cameraMode: "directed" }));
  window.input.files[0].text = async () => { throw new Error("File unavailable"); };
  await window.run();
  assert.equal(foundry.applications.api.DialogV2.confirm.mock.callCount(), 0);
  assert.equal(ui.notifications.error.mock.callCount(), 1);
  assert.deepEqual(writes, []);
  assert.ok(window.buttons.every((button) => !button.disabled));
});

test("the import control refreshes saved settings and requests client reloads", async () => {
  const window = importWindow(backup({ observerUserId: "other-world-user", cameraMode: "directed" }));
  await window.run();
  assert.equal(ui.notifications.info.mock.callCount(), 1);
  assert.equal(ui.notifications.warn.mock.callCount(), 2);
  assert.equal(game.settings.sheet.render.mock.callCount(), 1);
  assert.equal(window.input.value, "");
  assert.ok(window.buttons.every((button) => !button.disabled));
});

test("rechecks GM access after import confirmation", async () => {
  mock.method(foundry.applications.api.DialogV2, "confirm", async () => {
    game.user.isGM = false;
    return true;
  });
  await importWindow(backup({ cameraMode: "directed" })).run();
  assert.deepEqual(writes, []);
  assert.equal(ui.notifications.error.mock.callCount(), 1);
});

test("blocks duplicate import clicks while confirmation is open", async () => {
  let resolveConfirmation;
  mock.method(foundry.applications.api.DialogV2, "confirm", () => new Promise((resolve) => { resolveConfirmation = resolve; }));
  const window = importWindow(backup({ cameraMode: "directed" }));
  const first = window.run();
  await Promise.resolve();
  assert.ok(window.buttons.every((button) => button.disabled));
  await window.run();
  assert.equal(foundry.applications.api.DialogV2.confirm.mock.callCount(), 1);
  resolveConfirmation(true);
  await first;
  assert.deepEqual(writes, [[SETTINGS.CAMERA_MODE, "directed"]]);
});
