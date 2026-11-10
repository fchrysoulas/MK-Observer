import { MODULE_ID, MODULE_VERSION, SETTINGS } from "./constants.js";
import { format, localize } from "./utils.js";

const SCHEMA_VERSION = 1;

class SettingsTransferError extends Error {}

function fail(key) {
  throw new SettingsTransferError(localize(`settingsTransfer.${key}`));
}

function requireGM() {
  if (!game.user?.isGM) fail("gmOnly");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function exportSettings() {
  requireGM();
  return {
    module: MODULE_ID,
    schemaVersion: SCHEMA_VERSION,
    moduleVersion: game.modules.get(MODULE_ID)?.version ?? MODULE_VERSION,
    exportedAt: new Date().toISOString(),
    settings: Object.fromEntries(Object.values(SETTINGS).map((key) => [key, game.settings.get(MODULE_ID, key)]))
  };
}

export function validateSettingsImport(json) {
  requireGM();
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    fail("invalidFile");
  }

  if (!isRecord(data) || data.module !== MODULE_ID) fail("invalidFile");
  if (data.schemaVersion !== SCHEMA_VERSION) fail("unsupportedSchema");
  if (!isRecord(data.settings) || !Object.keys(data.settings).length) fail("invalidFile");

  const settings = [];
  let observerSkipped = false;
  for (const [key, value] of Object.entries(data.settings)) {
    if (!Object.values(SETTINGS).includes(key)) fail("invalidSetting");
    const config = game.settings.settings.get(`${MODULE_ID}.${key}`);
    if (!config || config.scope !== "world") fail("invalidSetting");

    if (config.type === Boolean && typeof value !== "boolean") fail("invalidSetting");
    if (config.type === String && typeof value !== "string") fail("invalidSetting");
    if (config.type === Number) {
      if (typeof value !== "number" || !Number.isFinite(value)) fail("invalidSetting");
      if (config.range && (value < config.range.min || value > config.range.max)) fail("invalidSetting");
    }

    if (key === SETTINGS.OBSERVER_USER_ID && value) {
      const user = game.users.get(value);
      if (!user || user.isGM) {
        observerSkipped = true;
        continue;
      }
    } else if (config.choices && !Object.hasOwn(config.choices, value)) {
      fail("invalidSetting");
    }
    settings.push([key, value]);
  }

  const values = new Map(settings);
  const minimum = values.get(SETTINGS.MIN_SCALE) ?? game.settings.get(MODULE_ID, SETTINGS.MIN_SCALE);
  const maximum = values.get(SETTINGS.MAX_SCALE) ?? game.settings.get(MODULE_ID, SETTINGS.MAX_SCALE);
  if (minimum > maximum) fail("invalidScale");

  return { settings, observerSkipped };
}

export async function importSettings(json) {
  // Validate again after confirmation in case permissions or world users changed.
  const { settings, observerSkipped } = validateSettingsImport(json);
  const changes = settings.map(([key, value]) => ({ key, value, previous: game.settings.get(MODULE_ID, key) }))
    .filter(({ value, previous }) => value !== previous);
  const attempted = [];

  try {
    for (const change of changes) {
      attempted.push(change);
      await game.settings.set(MODULE_ID, change.key, change.value);
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Settings import failed`, error);
    let restored = true;
    for (const { key, previous } of attempted.reverse()) {
      try {
        if (game.settings.get(MODULE_ID, key) === previous) continue;
        await game.settings.set(MODULE_ID, key, previous);
      } catch (rollbackError) {
        restored = false;
        console.error(`${MODULE_ID} | Could not restore setting ${key}`, rollbackError);
      }
    }
    fail(restored ? "importRestored" : "importIncomplete");
  }

  return { count: changes.length, observerSkipped };
}

export class SettingsTransfer extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-settings-transfer`,
    window: { title: `${MODULE_ID}.settingsTransfer.title` },
    position: { width: 480, height: "auto" },
    actions: {
      exportSettings: SettingsTransfer.#onExport,
      importSettings: SettingsTransfer.#onImport
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/settings-transfer.hbs` }
  };

  static #onExport() {
    try {
      const data = JSON.stringify(exportSettings(), null, 2);
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${MODULE_ID}-settings-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(`${MODULE_ID} | Settings export failed`, error);
      ui.notifications.error(error instanceof SettingsTransferError ? error.message : localize("settingsTransfer.exportFailed"));
    }
  }

  static async #onImport() {
    if (this.transferPending) return;
    const fileInput = this.element.querySelector('input[name="settingsFile"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      ui.notifications.warn(localize("settingsTransfer.chooseFile"));
      return;
    }

    this.transferPending = true;
    const buttons = this.element.querySelectorAll("button[data-action]");
    for (const button of buttons) button.disabled = true;
    try {
      requireGM();
      const json = await file.text();
      validateSettingsImport(json);
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: localize("settingsTransfer.title") },
        content: `<p>${localize("settingsTransfer.confirmImport")}</p>`,
        rejectClose: false,
        modal: true
      });
      if (!confirmed) return;

      const result = await importSettings(json);
      if (result.observerSkipped) ui.notifications.warn(localize("settingsTransfer.observerSkipped"), { permanent: true });
      ui.notifications.info(format("settingsTransfer.imported", { count: result.count }));
      if (result.count) ui.notifications.warn(localize("settingsTransfer.reloadRequired"), { permanent: true });
      // Refresh the settings form so a later Save cannot overwrite imported values.
      game.settings.sheet?.render({ force: true });
      fileInput.value = "";
    } catch (error) {
      console.error(`${MODULE_ID} | Settings import failed`, error);
      ui.notifications.error(error instanceof SettingsTransferError ? error.message : localize("settingsTransfer.importFailed"), { permanent: true });
    } finally {
      this.transferPending = false;
      for (const button of buttons) button.disabled = false;
    }
  }
}

export function registerSettingsTransferMenu() {
  game.settings.registerMenu(MODULE_ID, "settingsTransfer", {
    name: `${MODULE_ID}.settingsTransfer.title`,
    label: `${MODULE_ID}.settingsTransfer.open`,
    hint: `${MODULE_ID}.settingsTransfer.hint`,
    icon: "fas fa-file-export",
    type: SettingsTransfer,
    restricted: true
  });
}
