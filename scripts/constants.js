export const MODULE_ID = "mk-observer";
export const MODULE_TITLE = "MK-Observer";
export const MODULE_VERSION = "0.5.7";
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const CAMERA_MODES = Object.freeze({
  AUTOMATIC: "automatic",
  DIRECTED: "directed",
  DISABLED: "disabled"
});

export const CHAT_MODES = Object.freeze({
  DISABLED: "disabled",
  NOTIFICATIONS: "notifications",
  POPOUT: "popout",
  DETACHED: "detached"
});

export const CHAT_NOTIFICATION_ANCHORS = Object.freeze({
  TOP_LEFT: "top-left",
  TOP_CENTER: "top-center",
  TOP_RIGHT: "top-right",
  CENTER_LEFT: "center-left",
  CENTER: "center",
  CENTER_RIGHT: "center-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_CENTER: "bottom-center",
  BOTTOM_RIGHT: "bottom-right"
});

export const SETTINGS = Object.freeze({
  OBSERVER_USER_ID: "observerUserId",
  CAMERA_MODE: "cameraMode",
  LIMIT_TO_SCENE: "limitToScene",
  SCENE_MARGIN_TOP: "sceneMarginTop",
  SCENE_MARGIN_BOTTOM: "sceneMarginBottom",
  SCENE_MARGIN_LEFT: "sceneMarginLeft",
  SCENE_MARGIN_RIGHT: "sceneMarginRight",
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
  CHAT_NOTIFICATION_ANCHOR: "chatNotificationAnchor",
  CHAT_NOTIFICATION_OFFSET_X: "chatNotificationOffsetX",
  CHAT_NOTIFICATION_OFFSET_Y: "chatNotificationOffsetY",
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
