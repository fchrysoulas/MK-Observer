import { MODULE_ID, SETTINGS } from "./constants.js";
import {
  getRootElement,
  getSetting,
  isObserverClient,
  isTrackedToken,
  localize
} from "./utils.js";

export class ObserverUI {
  constructor(socket, camera) {
    this.socket = socket;
    this.camera = camera;
    this.diceObserver = null;
    this.controlsObserver = null;
  }

  setup() {
    Hooks.once("ready", () => this.#onReady());
    Hooks.on("renderTokenHUD", (app, html) => this.#addTrackingButton(app, html));
    Hooks.on("renderSceneControls", (_app, html) => this.#applyObserverControlSuppression(getRootElement(html) ?? document));
    Hooks.on(`${MODULE_ID}.refreshObserverUI`, () => this.#applyObserverClasses());
    Hooks.on("diceSoNiceReady", () => this.#applyDiceSoNiceSuppression());
  }

  async clearTrackedTokens() {
    if (!game.user.isGM || !canvas?.scene) return false;

    const tracked = canvas.scene.tokens.filter((token) => token.getFlag(MODULE_ID, "tracked"));
    if (!tracked.length) return false;

    const updates = tracked.map((token) => ({
      _id: token.id,
      [`flags.${MODULE_ID}.tracked`]: false
    }));

    await canvas.scene.updateEmbeddedDocuments("Token", updates);
    this.socket.requestFocus();
    return true;
  }

  #onReady() {
    if (!isObserverClient()) return;
    this.#applyObserverClasses();
    this.#observeDiceSoNiceLayer();
    this.#observeObserverControls();
  }

  #applyObserverClasses() {
    if (!isObserverClient() || !document.body) return;

    document.body.classList.add("mk-observer-client");
    document.body.classList.toggle("mk-observer-minimal", getSetting(SETTINGS.HIDE_OBSERVER_UI));
    document.body.classList.toggle("mk-observer-hide-controls", getSetting(SETTINGS.HIDE_OBSERVER_CONTROLS));
    document.body.classList.toggle("mk-observer-hide-dice-so-nice", getSetting(SETTINGS.HIDE_DICE_SO_NICE));
    document.body.classList.toggle("mk-observer-hide-logo", !getSetting(SETTINGS.SHOW_LOGO));
    document.body.classList.toggle("mk-observer-hide-navigation", !getSetting(SETTINGS.SHOW_NAVIGATION));
    document.body.classList.toggle("mk-observer-hide-player-list", !getSetting(SETTINGS.SHOW_PLAYER_LIST));
    document.body.classList.toggle("mk-observer-hide-sidebar", !getSetting(SETTINGS.SHOW_SIDEBAR));
    document.body.classList.toggle("mk-observer-hide-hotbar", !getSetting(SETTINGS.SHOW_HOTBAR));

    this.#applyDiceSoNiceSuppression();
    this.#applyObserverControlSuppression();
  }

  #applyObserverControlSuppression(root = document) {
    if (!isObserverClient()) return;

    const hidden = Boolean(
      getSetting(SETTINGS.HIDE_OBSERVER_UI)
      || getSetting(SETTINGS.HIDE_OBSERVER_CONTROLS)
    );
    const selector = [
      "#controls",
      "#scene-controls",
      "#scene-controls-container",
      ".scene-controls",
      ".scene-controls-container",
      ".scene-controls-app",
      "[data-application-part='scene-controls']",
      "[data-application-id='scene-controls']",
      "[data-appid='scene-controls']"
    ].join(",");

    const elements = new Set(root.querySelectorAll?.(selector) ?? []);
    if (root instanceof Element && root.matches(selector)) elements.add(root);

    // ApplicationV2 may expose the controls element through ui.controls even when
    // its generated id/class differs between Foundry generations.
    const appElement = getRootElement(ui?.controls?.element);
    if (appElement) elements.add(appElement);

    for (const element of elements) {
      element.classList.toggle("mk-observer-observer-controls-hidden", hidden);
      if (hidden) {
        element.style.setProperty("display", "none", "important");
        element.setAttribute("aria-hidden", "true");
      } else {
        element.style.removeProperty("display");
        element.removeAttribute("aria-hidden");
      }
    }
  }

  #observeObserverControls() {
    if (!document.body || this.controlsObserver) return;

    this.controlsObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          this.#applyObserverControlSuppression(node);
        }
      }
    });

    this.controlsObserver.observe(document.body, { childList: true, subtree: true });
    this.#applyObserverControlSuppression();
  }

  #applyDiceSoNiceSuppression(root = document) {
    if (!isObserverClient()) return;

    const selector = [
      "#dice-box-canvas",
      "[id^='dice-box-canvas']",
      ".dice-box-canvas",
      "#dice-so-nice-canvas",
      ".dice-so-nice-canvas",
      ".dsn-dice-canvas"
    ].join(",");
    const hidden = Boolean(getSetting(SETTINGS.HIDE_DICE_SO_NICE));
    const elements = new Set(root.querySelectorAll?.(selector) ?? []);
    if (root instanceof Element && root.matches(selector)) elements.add(root);

    for (const element of elements) {
      element.classList.toggle("mk-observer-dsn-hidden", hidden);
      if (hidden) element.setAttribute("aria-hidden", "true");
      else element.removeAttribute("aria-hidden");
    }
  }

  #observeDiceSoNiceLayer() {
    if (!document.body || this.diceObserver) return;

    this.diceObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          this.#applyDiceSoNiceSuppression(node.matches?.("#dice-box-canvas, [id^='dice-box-canvas'], .dice-box-canvas, #dice-so-nice-canvas, .dice-so-nice-canvas, .dsn-dice-canvas") ? node.parentElement ?? document : node);
        }
      }
    });

    this.diceObserver.observe(document.body, { childList: true, subtree: true });
  }

  #addTrackingButton(app, html) {
    if (!game.user.isGM) return;

    const root = getRootElement(html);
    const token = app?.object;
    if (!root || !token?.document) return;

    const column = root.querySelector(".col.right") ?? root.querySelector(".right");
    if (!column || column.querySelector("[data-mk-observer-track]")) return;

    const controlled = canvas.tokens?.controlled ?? [];
    const group = controlled.some((entry) => entry.id === token.id) ? controlled : [token];
    const allTracked = group.every(isTrackedToken);

    const button = document.createElement("div");
    button.className = "control-icon mk-observer-track-control";
    button.dataset.mkObserverTrack = "true";
    button.classList.toggle("active", allTracked);
    button.title = localize(allTracked ? "ui.untrackTokens" : "ui.trackTokens");
    button.innerHTML = '<i class="fas fa-video"></i>';

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const nextState = !group.every(isTrackedToken);
      const updates = group.map((entry) => ({
        _id: entry.document.id,
        [`flags.${MODULE_ID}.tracked`]: nextState
      }));

      await canvas.scene.updateEmbeddedDocuments("Token", updates);
      button.classList.toggle("active", nextState);
      button.title = localize(nextState ? "ui.untrackTokens" : "ui.trackTokens");
      this.socket.requestFocus();
    });

    column.append(button);
  }
}
