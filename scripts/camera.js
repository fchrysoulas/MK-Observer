import { CAMERA_MODES, MODULE_ID, SETTINGS } from "./constants.js";
import {
  clamp,
  debug,
  getSetting,
  isObserverClient,
  isTrackedToken,
  tokenHasPlayerOwner,
  tokenIsEligible
} from "./utils.js";

const MIN_SMOOTH_TIME = 0.01;
const MAX_FRAME_DELTA = 0.1;
const POSITION_SETTLE_EPSILON = 0.02;
const SCALE_SETTLE_EPSILON = 0.0001;
const VIEW_SETTLE_EPSILON = 0.001;

function fitMargins(first, second, span) {
  const firstMargin = Math.max(0, Number(first) || 0);
  const secondMargin = Math.max(0, Number(second) || 0);
  const total = firstMargin + secondMargin;
  const maximumTotal = Math.max(span - Math.min(span, 1), 0);
  const factor = total > maximumTotal && total > 0 ? maximumTotal / total : 1;

  return {
    first: firstMargin * factor,
    second: secondMargin * factor
  };
}

/**
 * Smooth a scalar value toward a target using a critically damped spring.
 * This is frame-rate independent and avoids the repeated start/stop motion
 * caused by launching a new canvas.animatePan() animation for every update.
 */
function smoothDamp(current, target, velocity, smoothTime, maximumSpeed, deltaTime) {
  const safeSmoothTime = Math.max(MIN_SMOOTH_TIME, smoothTime);
  const omega = 2 / safeSmoothTime;
  const x = omega * deltaTime;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;
  const originalTarget = target;

  if (Number.isFinite(maximumSpeed) && maximumSpeed > 0) {
    const maximumChange = maximumSpeed * safeSmoothTime;
    change = clamp(change, -maximumChange, maximumChange);
  }

  target = current - change;
  const temporary = (velocity + omega * change) * deltaTime;
  const nextVelocity = (velocity - omega * temporary) * decay;
  let output = target + (change + temporary) * decay;
  let outputVelocity = nextVelocity;

  // Prevent the spring from crossing the destination and oscillating.
  if ((originalTarget - current > 0) === (output > originalTarget)) {
    output = originalTarget;
    outputVelocity = 0;
  }

  return { value: output, velocity: outputVelocity };
}

export class ObserverCamera {
  constructor() {
    this.focusTimer = null;
    this.targetView = null;
    this.lastViewKey = "";
    this.lastFrameTime = null;
    this.animationFrame = null;
    this.lastMode = null;
    this.panVelocity = { x: 0, y: 0 };
    this.zoomVelocity = 0;
  }

  setup() {
    if (!isObserverClient()) return;

    Hooks.on("canvasReady", () => this.#handleCanvasReady());
    Hooks.on("canvasTearDown", () => this.#resetMotion({ clearTarget: true }));
    Hooks.on("createToken", () => this.scheduleFocus());
    Hooks.on("updateToken", () => this.scheduleFocus());
    Hooks.on("deleteToken", () => this.scheduleFocus());
    Hooks.on("updateCombat", () => this.scheduleFocus());
    Hooks.on("createCombat", () => this.scheduleFocus());
    Hooks.on("deleteCombat", () => this.scheduleFocus());
    Hooks.on("targetToken", () => this.scheduleFocus());
    Hooks.on("canvasPan", (_canvas, position) => this.enforceSceneBounds(position));
    Hooks.on(`${MODULE_ID}.cameraModeChanged`, () => this.#handleModeChange());
    Hooks.on(`${MODULE_ID}.sceneBoundsChanged`, () => this.#handleSceneBoundsChange());
    Hooks.on(`${MODULE_ID}.refocus`, () => this.scheduleFocus({ immediate: true, force: true }));

    window.addEventListener("resize", () => this.enforceSceneBounds());

    Hooks.once("ready", () => this.#startMotionLoop());
  }

  scheduleFocus({ immediate = false, force = false } = {}) {
    if (!isObserverClient()) return;

    if (immediate) {
      window.clearTimeout(this.focusTimer);
      this.focusTimer = null;
      this.focus({ force });
      return;
    }

    // A timer already in flight keeps the requested cinematic delay while
    // still reading the newest token positions when it fires.
    if (this.focusTimer) return;

    const delay = Math.max(0, Number(getSetting(SETTINGS.REACTION_DELAY)) || 0);
    this.focusTimer = window.setTimeout(() => {
      this.focusTimer = null;
      this.focus({ force });
    }, delay);
  }

  focus({ force = false } = {}) {
    if (!canvas?.ready) return;
    if (getSetting(SETTINGS.CAMERA_MODE) !== CAMERA_MODES.AUTOMATIC) return;

    const targets = this.#getFocusTokens();
    if (!targets.length) {
      debug("No eligible tokens found for automatic focus");
      return;
    }

    const view = this.#calculateView(targets);
    if (!view) return;

    const viewKey = `${Math.round(view.x)}:${Math.round(view.y)}:${view.scale.toFixed(3)}`;
    if (!force && viewKey === this.lastViewKey) return;

    this.lastViewKey = viewKey;
    this.targetView = view;
    debug("Automatic camera target", { targets: targets.map((token) => token.name), view });
  }

  applyDirectedPan(position) {
    if (!isObserverClient()) return;
    if (getSetting(SETTINGS.CAMERA_MODE) !== CAMERA_MODES.DIRECTED) return;
    if (!canvas?.ready || !position) return;

    const view = {
      x: Number(position.x),
      y: Number(position.y),
      scale: Number(position.scale)
    };

    if (![view.x, view.y, view.scale].every(Number.isFinite)) return;
    this.targetView = this.#constrainView(view);
  }

  /**
   * Keep the observer's current manual view inside the active scene. This is
   * deliberately applied only on the selected observer client, so it cannot
   * constrain a GM or a normal player's canvas controls.
   */
  enforceSceneBounds(view = null) {
    if (!isObserverClient() || !canvas?.ready) return;

    const current = view && [view.x, view.y, view.scale].every(Number.isFinite)
      ? { x: Number(view.x), y: Number(view.y), scale: Number(view.scale) }
      : this.#currentView();
    if (!current) return;

    const constrained = this.#constrainView(current);
    if (this.#viewsMatch(current, constrained)) return;

    try {
      canvas.pan(constrained);
    } catch (error) {
      console.error(`${MODULE_ID} | Scene-bound camera update failed`, error);
    }
  }

  #handleCanvasReady() {
    this.#resetMotion({ clearTarget: true });
    window.setTimeout(() => this.enforceSceneBounds(), 0);
    this.scheduleFocus({ immediate: true, force: true });
  }

  #handleModeChange() {
    this.#resetMotion({ clearTarget: true });
    if (getSetting(SETTINGS.CAMERA_MODE) === CAMERA_MODES.AUTOMATIC) {
      this.scheduleFocus({ immediate: true, force: true });
    }
  }

  #handleSceneBoundsChange() {
    this.enforceSceneBounds();
    this.scheduleFocus({ immediate: true, force: true });
  }

  #startMotionLoop() {
    if (this.animationFrame) return;

    const tick = (timestamp) => {
      this.animationFrame = window.requestAnimationFrame(tick);
      this.#updateMotion(timestamp);
    };

    this.animationFrame = window.requestAnimationFrame(tick);
  }

  #updateMotion(timestamp) {
    if (!isObserverClient() || !canvas?.ready || !canvas.stage) {
      this.lastFrameTime = timestamp;
      return;
    }

    const mode = getSetting(SETTINGS.CAMERA_MODE);
    if (mode !== this.lastMode) {
      this.lastMode = mode;
      this.#resetMotion({ clearTarget: mode === CAMERA_MODES.DISABLED });
    }

    if (mode === CAMERA_MODES.DISABLED || !this.targetView) {
      this.lastFrameTime = timestamp;
      return;
    }

    if (this.lastFrameTime === null) {
      this.lastFrameTime = timestamp;
      return;
    }

    const deltaTime = clamp((timestamp - this.lastFrameTime) / 1000, 0, MAX_FRAME_DELTA);
    this.lastFrameTime = timestamp;
    if (deltaTime <= 0) return;

    const current = this.#currentView();
    if (!current) return;

    const target = this.#constrainView(this.targetView);
    const screenDistance = Math.hypot(target.x - current.x, target.y - current.y) * current.scale;
    const panDeadZone = Math.max(0, Number(getSetting(SETTINGS.PAN_DEAD_ZONE)) || 0);

    if (screenDistance <= panDeadZone) {
      target.x = current.x;
      target.y = current.y;
      this.panVelocity.x = 0;
      this.panVelocity.y = 0;
    }

    const zoomDifferencePercent = current.scale > 0
      ? Math.abs(target.scale - current.scale) / current.scale * 100
      : Infinity;
    const zoomDeadZone = Math.max(0, Number(getSetting(SETTINGS.ZOOM_DEAD_ZONE)) || 0);

    if (zoomDifferencePercent <= zoomDeadZone) {
      target.scale = current.scale;
      this.zoomVelocity = 0;
    }

    const panSmoothTime = Math.max(MIN_SMOOTH_TIME, (Number(getSetting(SETTINGS.PAN_SMOOTH_TIME)) || 0) / 1000);
    const zoomSmoothTime = Math.max(MIN_SMOOTH_TIME, (Number(getSetting(SETTINGS.ZOOM_SMOOTH_TIME)) || 0) / 1000);

    const configuredPanSpeed = Number(getSetting(SETTINGS.MAX_PAN_SPEED)) || 0;
    const maximumWorldSpeed = configuredPanSpeed > 0
      ? configuredPanSpeed / Math.max(current.scale, 0.01)
      : Infinity;

    const configuredZoomSpeed = Number(getSetting(SETTINGS.MAX_ZOOM_SPEED)) || 0;
    const maximumZoomSpeed = configuredZoomSpeed > 0 ? configuredZoomSpeed : Infinity;

    const nextX = smoothDamp(
      current.x,
      target.x,
      this.panVelocity.x,
      panSmoothTime,
      maximumWorldSpeed,
      deltaTime
    );
    const nextY = smoothDamp(
      current.y,
      target.y,
      this.panVelocity.y,
      panSmoothTime,
      maximumWorldSpeed,
      deltaTime
    );
    const nextScale = smoothDamp(
      current.scale,
      target.scale,
      this.zoomVelocity,
      zoomSmoothTime,
      maximumZoomSpeed,
      deltaTime
    );

    this.panVelocity.x = nextX.velocity;
    this.panVelocity.y = nextY.velocity;
    this.zoomVelocity = nextScale.velocity;

    const positionSettled = Math.hypot(nextX.value - current.x, nextY.value - current.y) <= POSITION_SETTLE_EPSILON;
    const scaleSettled = Math.abs(nextScale.value - current.scale) <= SCALE_SETTLE_EPSILON;
    if (positionSettled && scaleSettled) return;

    try {
      canvas.pan({
        x: nextX.value,
        y: nextY.value,
        scale: nextScale.value
      });
    } catch (error) {
      console.error(`${MODULE_ID} | Cinematic camera update failed`, error);
      this.#resetMotion({ clearTarget: false });
    }
  }

  #currentView() {
    const x = Number(canvas.stage?.pivot?.x);
    const y = Number(canvas.stage?.pivot?.y);
    const scale = Number(canvas.stage?.scale?.x);
    if (![x, y, scale].every(Number.isFinite)) return null;
    return { x, y, scale };
  }

  #resetMotion({ clearTarget = false } = {}) {
    this.lastFrameTime = null;
    this.panVelocity.x = 0;
    this.panVelocity.y = 0;
    this.zoomVelocity = 0;
    this.lastViewKey = "";
    if (clearTarget) this.targetView = null;
  }

  #getFocusTokens() {
    const allTokens = (canvas.tokens?.placeables ?? []).filter(tokenIsEligible);
    const manuallyTracked = allTokens.filter(isTrackedToken);
    if (manuallyTracked.length) return manuallyTracked;

    if (getSetting(SETTINGS.TRACK_COMBAT) && (game.combat?.started || Number(game.combat?.round) > 0)) {
      const combatTokens = this.#getCombatTokens(allTokens);
      if (combatTokens.length) return combatTokens;
    }

    return allTokens.filter(tokenHasPlayerOwner);
  }

  #getCombatTokens(allTokens) {
    const combatant = game.combat?.combatant;
    const activeTokenId = combatant?.tokenId ?? combatant?.token?.id;
    const activeToken = activeTokenId ? canvas.tokens.get(activeTokenId) : null;
    if (!activeToken || !tokenIsEligible(activeToken)) return [];

    const tokens = [activeToken];
    if (!getSetting(SETTINGS.INCLUDE_TARGETS)) return tokens;

    const relevantUsers = this.#getRelevantCombatUsers(combatant);
    for (const token of allTokens) {
      if (token.id === activeToken.id || !token.targeted?.size) continue;
      const isRelevantTarget = Array.from(token.targeted).some((user) => relevantUsers.has(user.id));
      if (isRelevantTarget) tokens.push(token);
    }

    return tokens;
  }

  #getRelevantCombatUsers(combatant) {
    const users = new Set();
    const actor = combatant?.actor;

    if (actor) {
      for (const user of game.users) {
        if (!user.isGM && actor.testUserPermission(user, "OWNER")) users.add(user.id);
      }
    }

    if (!users.size) {
      for (const user of game.users) {
        if (user.isGM) users.add(user.id);
      }
    }

    return users;
  }

  #calculateView(tokens) {
    const rectangles = tokens.map((token) => this.#tokenRectangle(token)).filter(Boolean);
    if (!rectangles.length) return null;

    const minX = Math.min(...rectangles.map((rectangle) => rectangle.left));
    const minY = Math.min(...rectangles.map((rectangle) => rectangle.top));
    const maxX = Math.max(...rectangles.map((rectangle) => rectangle.right));
    const maxY = Math.max(...rectangles.map((rectangle) => rectangle.bottom));

    const width = Math.max(maxX - minX, canvas.grid?.size ?? 100);
    const height = Math.max(maxY - minY, canvas.grid?.size ?? 100);
    const padding = Number(getSetting(SETTINGS.CAMERA_PADDING)) || 0;
    const availableWidth = Math.max(window.innerWidth - padding * 2, 100);
    const availableHeight = Math.max(window.innerHeight - padding * 2, 100);

    const configuredMin = Number(getSetting(SETTINGS.MIN_SCALE)) || 0.1;
    const configuredMax = Number(getSetting(SETTINGS.MAX_SCALE)) || 1;
    const minimumScale = Math.min(configuredMin, configuredMax);
    const maximumScale = Math.max(configuredMin, configuredMax);
    const scale = clamp(Math.min(availableWidth / width, availableHeight / height), minimumScale, maximumScale);

    return this.#constrainView({
      x: minX + width / 2,
      y: minY + height / 2,
      scale
    });
  }

  #constrainView(view) {
    if (!getSetting(SETTINGS.LIMIT_TO_SCENE)) return { ...view };

    const rectangle = this.#sceneRectangle();
    const viewport = this.#viewportSize();
    if (!rectangle || !viewport) return { ...view };

    // A view wider or taller than the scene would reveal the padded canvas.
    // Raise its scale just enough to keep the scene filling the viewport.
    const scale = Math.max(
      Number(view.scale),
      viewport.width / rectangle.width,
      viewport.height / rectangle.height
    );
    if (!Number.isFinite(scale) || scale <= 0) return { ...view };

    const halfWidth = viewport.width / (2 * scale);
    const halfHeight = viewport.height / (2 * scale);
    const minimumX = rectangle.left + halfWidth;
    const maximumX = rectangle.right - halfWidth;
    const minimumY = rectangle.top + halfHeight;
    const maximumY = rectangle.bottom - halfHeight;

    return {
      x: minimumX > maximumX
        ? (rectangle.left + rectangle.right) / 2
        : clamp(Number(view.x), minimumX, maximumX),
      y: minimumY > maximumY
        ? (rectangle.top + rectangle.bottom) / 2
        : clamp(Number(view.y), minimumY, maximumY),
      scale
    };
  }

  #sceneRectangle() {
    const dimensions = canvas.dimensions;
    if (!dimensions) return null;

    const left = Number(dimensions.sceneX ?? dimensions.rect?.x ?? 0);
    const top = Number(dimensions.sceneY ?? dimensions.rect?.y ?? 0);
    const width = Number(dimensions.sceneWidth ?? dimensions.rect?.width);
    const height = Number(dimensions.sceneHeight ?? dimensions.rect?.height);
    if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;

    const horizontalMargins = fitMargins(
      getSetting(SETTINGS.SCENE_MARGIN_LEFT),
      getSetting(SETTINGS.SCENE_MARGIN_RIGHT),
      width
    );
    const verticalMargins = fitMargins(
      getSetting(SETTINGS.SCENE_MARGIN_TOP),
      getSetting(SETTINGS.SCENE_MARGIN_BOTTOM),
      height
    );
    const boundedLeft = left + horizontalMargins.first;
    const boundedTop = top + verticalMargins.first;
    const boundedWidth = width - horizontalMargins.first - horizontalMargins.second;
    const boundedHeight = height - verticalMargins.first - verticalMargins.second;

    return {
      left: boundedLeft,
      top: boundedTop,
      width: boundedWidth,
      height: boundedHeight,
      right: boundedLeft + boundedWidth,
      bottom: boundedTop + boundedHeight
    };
  }

  #viewportSize() {
    const screen = canvas.app?.renderer?.screen;
    const width = Number(screen?.width ?? canvas.app?.renderer?.width ?? window.innerWidth);
    const height = Number(screen?.height ?? canvas.app?.renderer?.height ?? window.innerHeight);
    if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;

    return { width, height };
  }

  #viewsMatch(first, second) {
    return Math.abs(first.x - second.x) <= VIEW_SETTLE_EPSILON
      && Math.abs(first.y - second.y) <= VIEW_SETTLE_EPSILON
      && Math.abs(first.scale - second.scale) <= VIEW_SETTLE_EPSILON;
  }

  #tokenRectangle(token) {
    const gridSize = canvas.grid?.size ?? canvas.dimensions?.size ?? 100;
    const x = Number(token.x ?? token.document?.x);
    const y = Number(token.y ?? token.document?.y);
    const width = Number(token.w ?? (token.document?.width ?? 1) * gridSize);
    const height = Number(token.h ?? (token.document?.height ?? 1) * gridSize);

    if (![x, y, width, height].every(Number.isFinite)) return null;
    return { left: x, top: y, right: x + width, bottom: y + height };
  }
}
