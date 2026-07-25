import { CAMERA_MODES, CHAT_MODES, MODULE_ID, SETTINGS } from "./constants.js";

function key(setting, part) {
  return `${MODULE_ID}.settings.${setting}.${part}`;
}

function observerChoices() {
  const choices = { "": game.i18n.localize(`${MODULE_ID}.settings.noUser`) };
  for (const user of game.users?.contents ?? []) {
    if (!user.isGM) choices[user.id] = user.name;
  }
  return choices;
}

function register(keyName, data) {
  game.settings.register(MODULE_ID, keyName, data);
}

export function registerSettings() {
  register(SETTINGS.OBSERVER_USER_ID, {
    name: key(SETTINGS.OBSERVER_USER_ID, "name"),
    hint: key(SETTINGS.OBSERVER_USER_ID, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: String,
    choices: observerChoices(),
    default: ""
  });

  register(SETTINGS.CAMERA_MODE, {
    name: key(SETTINGS.CAMERA_MODE, "name"),
    hint: key(SETTINGS.CAMERA_MODE, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    choices: {
      [CAMERA_MODES.AUTOMATIC]: `${MODULE_ID}.cameraModes.automatic`,
      [CAMERA_MODES.DIRECTED]: `${MODULE_ID}.cameraModes.directed`,
      [CAMERA_MODES.DISABLED]: `${MODULE_ID}.cameraModes.disabled`
    },
    default: CAMERA_MODES.AUTOMATIC,
    onChange: (mode) => Hooks.callAll(`${MODULE_ID}.cameraModeChanged`, mode)
  });

  register(SETTINGS.HIDE_OBSERVER_UI, {
    name: key(SETTINGS.HIDE_OBSERVER_UI, "name"),
    hint: key(SETTINGS.HIDE_OBSERVER_UI, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: Boolean,
    default: true
  });

  register(SETTINGS.HIDE_OBSERVER_CONTROLS, {
    name: key(SETTINGS.HIDE_OBSERVER_CONTROLS, "name"),
    hint: key(SETTINGS.HIDE_OBSERVER_CONTROLS, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: Boolean,
    default: true
  });

  register(SETTINGS.HIDE_DICE_SO_NICE, {
    name: key(SETTINGS.HIDE_DICE_SO_NICE, "name"),
    hint: key(SETTINGS.HIDE_DICE_SO_NICE, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll(`${MODULE_ID}.refreshObserverUI`)
  });

  for (const [setting, defaultValue] of [
    [SETTINGS.SHOW_LOGO, false],
    [SETTINGS.SHOW_NAVIGATION, false],
    [SETTINGS.SHOW_PLAYER_LIST, false],
    [SETTINGS.SHOW_SIDEBAR, false],
    [SETTINGS.SHOW_HOTBAR, false]
  ]) {
    register(setting, {
      name: key(setting, "name"),
      hint: key(setting, "hint"),
      scope: "world",
      config: true,
      restricted: true,
      requiresReload: true,
      type: Boolean,
      default: defaultValue
    });
  }

  register(SETTINGS.CHAT_MODE, {
    name: key(SETTINGS.CHAT_MODE, "name"),
    hint: key(SETTINGS.CHAT_MODE, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: String,
    choices: {
      [CHAT_MODES.DISABLED]: `${MODULE_ID}.chatModes.disabled`,
      [CHAT_MODES.POPOUT]: `${MODULE_ID}.chatModes.popout`,
      [CHAT_MODES.DETACHED]: `${MODULE_ID}.chatModes.detached`
    },
    default: CHAT_MODES.DISABLED
  });

  register(SETTINGS.CHAT_WIDTH, {
    name: key(SETTINGS.CHAT_WIDTH, "name"),
    hint: key(SETTINGS.CHAT_WIDTH, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: Number,
    range: { min: 280, max: 1000, step: 10 },
    default: 380
  });

  register(SETTINGS.CHAT_HEIGHT, {
    name: key(SETTINGS.CHAT_HEIGHT, "name"),
    hint: key(SETTINGS.CHAT_HEIGHT, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: Number,
    range: { min: 240, max: 1200, step: 10 },
    default: 600
  });

  register(SETTINGS.CHAT_LEFT, {
    name: key(SETTINGS.CHAT_LEFT, "name"),
    hint: key(SETTINGS.CHAT_LEFT, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: Number,
    range: { min: -2000, max: 4000, step: 10 },
    default: 20
  });

  register(SETTINGS.CHAT_TOP, {
    name: key(SETTINGS.CHAT_TOP, "name"),
    hint: key(SETTINGS.CHAT_TOP, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: Number,
    range: { min: -2000, max: 4000, step: 10 },
    default: 80
  });

  register(SETTINGS.CHAT_READ_ONLY, {
    name: key(SETTINGS.CHAT_READ_ONLY, "name"),
    hint: key(SETTINGS.CHAT_READ_ONLY, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    requiresReload: true,
    type: Boolean,
    default: true
  });

  register(SETTINGS.TRACK_COMBAT, {
    name: key(SETTINGS.TRACK_COMBAT, "name"),
    hint: key(SETTINGS.TRACK_COMBAT, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll(`${MODULE_ID}.refocus`)
  });

  register(SETTINGS.INCLUDE_TARGETS, {
    name: key(SETTINGS.INCLUDE_TARGETS, "name"),
    hint: key(SETTINGS.INCLUDE_TARGETS, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll(`${MODULE_ID}.refocus`)
  });

  register(SETTINGS.IGNORE_HIDDEN, {
    name: key(SETTINGS.IGNORE_HIDDEN, "name"),
    hint: key(SETTINGS.IGNORE_HIDDEN, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll(`${MODULE_ID}.refocus`)
  });

  register(SETTINGS.CAMERA_PADDING, {
    name: key(SETTINGS.CAMERA_PADDING, "name"),
    hint: key(SETTINGS.CAMERA_PADDING, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0, max: 400, step: 10 },
    default: 120,
    onChange: () => Hooks.callAll(`${MODULE_ID}.refocus`)
  });

  register(SETTINGS.MIN_SCALE, {
    name: key(SETTINGS.MIN_SCALE, "name"),
    hint: key(SETTINGS.MIN_SCALE, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0.1, max: 3, step: 0.05 },
    default: 0.25,
    onChange: () => Hooks.callAll(`${MODULE_ID}.refocus`)
  });

  register(SETTINGS.MAX_SCALE, {
    name: key(SETTINGS.MAX_SCALE, "name"),
    hint: key(SETTINGS.MAX_SCALE, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0.1, max: 3, step: 0.05 },
    default: 1,
    onChange: () => Hooks.callAll(`${MODULE_ID}.refocus`)
  });

  register(SETTINGS.REACTION_DELAY, {
    name: key(SETTINGS.REACTION_DELAY, "name"),
    hint: key(SETTINGS.REACTION_DELAY, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0, max: 1000, step: 25 },
    default: 180
  });

  register(SETTINGS.PAN_SMOOTH_TIME, {
    name: key(SETTINGS.PAN_SMOOTH_TIME, "name"),
    hint: key(SETTINGS.PAN_SMOOTH_TIME, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 50, max: 3000, step: 50 },
    default: 650
  });

  register(SETTINGS.ZOOM_SMOOTH_TIME, {
    name: key(SETTINGS.ZOOM_SMOOTH_TIME, "name"),
    hint: key(SETTINGS.ZOOM_SMOOTH_TIME, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 50, max: 4000, step: 50 },
    default: 900
  });

  register(SETTINGS.PAN_DEAD_ZONE, {
    name: key(SETTINGS.PAN_DEAD_ZONE, "name"),
    hint: key(SETTINGS.PAN_DEAD_ZONE, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0, max: 200, step: 5 },
    default: 24
  });

  register(SETTINGS.ZOOM_DEAD_ZONE, {
    name: key(SETTINGS.ZOOM_DEAD_ZONE, "name"),
    hint: key(SETTINGS.ZOOM_DEAD_ZONE, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0, max: 10, step: 0.25 },
    default: 1
  });

  register(SETTINGS.MAX_PAN_SPEED, {
    name: key(SETTINGS.MAX_PAN_SPEED, "name"),
    hint: key(SETTINGS.MAX_PAN_SPEED, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0, max: 4000, step: 100 },
    default: 1400
  });

  register(SETTINGS.MAX_ZOOM_SPEED, {
    name: key(SETTINGS.MAX_ZOOM_SPEED, "name"),
    hint: key(SETTINGS.MAX_ZOOM_SPEED, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 0, max: 3, step: 0.05 },
    default: 0.8
  });

  register(SETTINGS.DIRECTED_SAMPLE_INTERVAL, {
    name: key(SETTINGS.DIRECTED_SAMPLE_INTERVAL, "name"),
    hint: key(SETTINGS.DIRECTED_SAMPLE_INTERVAL, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    range: { min: 16, max: 250, step: 1 },
    default: 50
  });

  register(SETTINGS.DEBUG, {
    name: key(SETTINGS.DEBUG, "name"),
    hint: key(SETTINGS.DEBUG, "hint"),
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false
  });
}

export function refreshObserverChoices() {
  const config = game.settings.settings.get(`${MODULE_ID}.${SETTINGS.OBSERVER_USER_ID}`);
  if (config) config.choices = observerChoices();
}
