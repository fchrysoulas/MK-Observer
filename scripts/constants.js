export const MODULE_ID = "mk-observer";
export const MODULE_TITLE = "MK-Observer";
export const MODULE_VERSION = "0.5.1";
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const CAMERA_MODES = Object.freeze({
  AUTOMATIC: "automatic",
  DIRECTED: "directed",
  DISABLED: "disabled"
});

export const CHAT_MODES = Object.freeze({
  DISABLED: "disabled",
  POPOUT: "popout",
  DETACHED: "detached"
});

export const SETTINGS = Object.freeze({
  OBSERVER_USER_ID: "observerUserId",
  CAMERA_MODE: "cameraMode",
  LIMIT_TO_SCENE: "limitToScene",
  HIDE_OBSERVER_UI: "hideObserverUI",
  HIDE_OBSERVER_CONTROLS: "hideObserverControls",
  HIDE_DICE_SO_NICE: "hideDiceSoNice",
  SHOW_LOGO: "showLogo",
  SHOW_NAVIGATION: "showNavigation",
  SHOW_PLAYER_LIST: "showPlayerList",
  SHOW_SIDEBAR: "showSidebar",
  SHOW_HOTBAR: "showHotbar",
  CHAT_MODE: "chatMode",
  CHAT_WIDTH: "chatWidth",
  CHAT_HEIGHT: "chatHeight",
  CHAT_LEFT: "chatLeft",
  CHAT_TOP: "chatTop",
  CHAT_READ_ONLY: "chatReadOnly",
  TRACK_COMBAT: "trackCombat",
  INCLUDE_TARGETS: "includeTargets",
  IGNORE_HIDDEN: "ignoreHidden",
  CAMERA_PADDING: "cameraPadding",
  MIN_SCALE: "minimumScale",
  MAX_SCALE: "maximumScale",
  REACTION_DELAY: "reactionDelay",
  PAN_SMOOTH_TIME: "panSmoothTime",
  ZOOM_SMOOTH_TIME: "zoomSmoothTime",
  PAN_DEAD_ZONE: "panDeadZone",
  ZOOM_DEAD_ZONE: "zoomDeadZone",
  MAX_PAN_SPEED: "maximumPanSpeed",
  MAX_ZOOM_SPEED: "maximumZoomSpeed",
  DIRECTED_SAMPLE_INTERVAL: "directedSampleInterval",
  DEBUG: "debug"
});
