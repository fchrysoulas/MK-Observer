import { CAMERA_MODES, SOCKET_NAME, SETTINGS } from "./constants.js";
import { debug, getSetting, isActiveGM, isObserverClient } from "./utils.js";

export class ObserverSocket {
  constructor(camera) {
    this.camera = camera;
    this.lastDirectedSent = 0;
  }

  setup() {
    game.socket.on(SOCKET_NAME, (message) => this.#receive(message));

    if (game.user.isGM) {
      Hooks.on("canvasPan", (_canvas, position) => this.#sendDirectedPan(position));
      Hooks.on("canvasReady", () => this.#sendCurrentViewSoon());
      Hooks.on("mk-observer.cameraModeChanged", () => this.#sendCurrentViewSoon());
    }
  }

  emit(type, payload = {}) {
    game.socket.emit(SOCKET_NAME, {
      type,
      senderId: game.user.id,
      sceneId: canvas?.scene?.id ?? null,
      ...payload
    });
  }

  requestFocus() {
    this.emit("focusNow");
  }

  #sendCurrentViewSoon() {
    window.setTimeout(() => {
      if (!canvas?.ready || !canvas.stage) return;
      this.#sendDirectedPan({
        x: canvas.stage.pivot.x,
        y: canvas.stage.pivot.y,
        scale: canvas.stage.scale.x
      }, { force: true });
    }, 100);
  }

  #sendDirectedPan(position, { force = false } = {}) {
    if (getSetting(SETTINGS.CAMERA_MODE) !== CAMERA_MODES.DIRECTED) return;
    if (!canvas?.ready || !position) return;

    const now = performance.now();
    const interval = Math.max(16, Number(getSetting(SETTINGS.DIRECTED_SAMPLE_INTERVAL)) || 50);
    if (!force && now - this.lastDirectedSent < interval) return;
    this.lastDirectedSent = now;

    this.emit("directedPan", {
      position: {
        x: Number(position.x),
        y: Number(position.y),
        scale: Number(position.scale)
      }
    });
  }

  #receive(message) {
    if (!message || !isObserverClient()) return;
    if (!isActiveGM(message.senderId)) return;
    if (message.sceneId && message.sceneId !== canvas?.scene?.id) return;

    debug("Socket message received", message);

    switch (message.type) {
      case "directedPan":
        this.camera.applyDirectedPan(message.position);
        break;
      case "focusNow":
        this.camera.scheduleFocus({ immediate: true, force: true });
        break;
    }
  }
}
