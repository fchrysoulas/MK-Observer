import {
  CHAT_MODES,
  CHAT_NOTIFICATION_ANCHORS,
  MODULE_ID,
  SETTINGS
} from "./constants.js";
import { debug, getRootElement, getSetting, isObserverClient } from "./utils.js";

/**
 * Manage the observer chat display on supported Foundry generations.
 *
 * v13-v14: Native transient notifications or an ApplicationV2 sidebar popout.
 * v14: The popout can optionally detach into a native browser window.
 */
export class ObserverChatWindow {
  constructor() {
    this.chatApp = null;
    this.opening = false;
    this.controlObservers = new WeakMap();
  }

  setup() {
    Hooks.once("ready", () => this.#onReady());
    Hooks.on("renderChatLog", (app, html) => this.#onRenderChatLog(app, html));
  }

  async open() {
    if (!isObserverClient() || this.opening) return this.chatApp;

    const mode = getSetting(SETTINGS.CHAT_MODE);
    if (mode === CHAT_MODES.DISABLED) return null;
    if (mode === CHAT_MODES.NOTIFICATIONS) return this.#configureNativeNotifications();

    this.opening = true;
    try {
      const chat = this.#getChatTab();
      if (!chat) {
        console.warn(`${MODULE_ID} | Chat tab was not available; observer chat window was not opened.`);
        return null;
      }

      let popout = this.#findExistingPopout(chat);
      if (!popout) popout = await this.#renderPopout(chat);
      if (!popout) {
        console.warn(`${MODULE_ID} | Foundry did not provide a chat popout instance.`);
        return null;
      }

      this.chatApp = popout;
      this.#markChatWindow(popout);
      this.#setPosition(popout);

      if (mode === CHAT_MODES.DETACHED) {
        await this.#detachWhenSupported(popout);
      }

      await this.#scrollToBottom(chat, popout);
      debug("Observer chat window opened", {
        mode,
        generation: Number(game.release?.generation ?? game.version?.split?.(".")?.[0] ?? 0)
      });
      return popout;
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to open observer chat window`, error);
      return null;
    } finally {
      this.opening = false;
    }
  }

  async close() {
    const app = this.chatApp;
    this.chatApp = null;
    if (!app || typeof app.close !== "function") return false;

    try {
      await app.close();
      return true;
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to close observer chat window`, error);
      return false;
    }
  }

  async #onReady() {
    if (!isObserverClient()) return;
    const mode = getSetting(SETTINGS.CHAT_MODE);
    if (mode === CHAT_MODES.DISABLED) return;
    if (mode === CHAT_MODES.NOTIFICATIONS) {
      this.#configureNativeNotifications();
      return;
    }

    // Let the sidebar complete its own first render before asking for a popout.
    window.setTimeout(() => this.open(), 250);
  }

  #onRenderChatLog(app, html) {
    if (!isObserverClient()) return;
    if (getSetting(SETTINGS.CHAT_MODE) === CHAT_MODES.NOTIFICATIONS) {
      this.#configureNativeNotifications();
      return;
    }
    if (!this.#isPopout(app)) return;

    this.chatApp = app;
    const root = getRootElement(html) ?? getRootElement(app?.element);
    root?.classList.add("mk-observer-chat-window");
    this.#markChatWindow(app);
    this.#applyReadOnly(root);
    this.#observeChatControls(root);
    this.#setPosition(app);
  }

  #getChatTab() {
    return ui?.chat
      ?? ui?.sidebar?.tabs?.chat
      ?? null;
  }

  #configureNativeNotifications() {
    if (!document.body) return null;

    const anchors = Object.values(CHAT_NOTIFICATION_ANCHORS);
    const configuredAnchor = getSetting(SETTINGS.CHAT_NOTIFICATION_ANCHOR);
    const anchor = anchors.includes(configuredAnchor)
      ? configuredAnchor
      : CHAT_NOTIFICATION_ANCHORS.BOTTOM_RIGHT;
    const offsetX = Number(getSetting(SETTINGS.CHAT_NOTIFICATION_OFFSET_X)) || 0;
    const offsetY = Number(getSetting(SETTINGS.CHAT_NOTIFICATION_OFFSET_Y)) || 0;

    document.body.classList.add("mk-observer-native-chat-notifications");
    for (const value of anchors) {
      document.body.classList.toggle(`mk-observer-chat-anchor-${value}`, value === anchor);
    }
    document.body.classList.toggle(
      "mk-observer-native-chat-read-only",
      Boolean(getSetting(SETTINGS.CHAT_READ_ONLY))
    );
    document.body.style.setProperty("--mk-observer-chat-offset-x", `${offsetX}px`);
    document.body.style.setProperty("--mk-observer-chat-offset-y", `${offsetY}px`);

    // Core suppresses transient chat cards while the sidebar is expanded on
    // the chat tab. Keep its internal state aligned with our hidden sidebar.
    if (!getSetting(SETTINGS.SHOW_SIDEBAR) && ui?.sidebar?.expanded) {
      ui.sidebar.collapse?.();
    }

    const notifications = document.getElementById("chat-notifications");
    this.#applyReadOnly(notifications);
    this.#observeChatControls(notifications);
    debug("Native observer chat notifications configured", { anchor, offsetX, offsetY });
    return notifications;
  }

  #findExistingPopout(chat) {
    return chat?.popout
      ?? ui?.sidebar?.popouts?.chat
      ?? null;
  }

  async #renderPopout(chat) {
    if (typeof chat.renderPopout === "function") {
      const result = await Promise.resolve(chat.renderPopout());
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      return result ?? this.#findExistingPopout(chat);
    }

    return null;
  }

  async #detachWhenSupported(popout) {
    const generation = Number(game.release?.generation ?? game.version?.split?.(".")?.[0] ?? 0);
    if (generation < 14 || typeof popout.detachWindow !== "function") {
      console.info(`${MODULE_ID} | Native detached windows require Foundry v14; using a floating chat popout instead.`);
      return false;
    }

    try {
      const detached = await popout.detachWindow();
      if (detached) this.chatApp = detached;
      return true;
    } catch (error) {
      console.warn(`${MODULE_ID} | Native chat detachment failed; keeping the floating chat popout.`, error);
      return false;
    }
  }

  #isPopout(app) {
    return Boolean(
      app?.isPopout
      ?? app?._original
    );
  }

  #markChatWindow(app) {
    const root = getRootElement(app?.element);
    root?.classList.add("mk-observer-chat-window");
    this.#applyReadOnly(root);
    this.#observeChatControls(root);
  }

  #applyReadOnly(root) {
    if (!root) return;

    const hidden = Boolean(getSetting(SETTINGS.CHAT_READ_ONLY));
    root.classList.toggle("mk-observer-chat-read-only", hidden);

    const selectors = [
      // Foundry core chat composer and toolbar across v13-v14.
      "#chat-controls",
      "#chat-form",
      ".chat-controls",
      ".chat-form",
      ".chat-input",
      "[data-application-part='chat-controls']",
      "[data-application-part='chat-form']",
      "[data-application-part='chat-input']",
      "[data-application-part='controls']",
      // Dice Tray / Dice Calculator controls. These are control widgets only;
      // chat-message roll cards use different classes and remain visible.
      "#dice-tray",
      ".dice-tray",
      "[data-dice-tray]",
      "[data-application-part='dice-tray']"
    ];

    const controls = new Set(root.querySelectorAll(selectors.join(",")));

    // Some systems wrap their message field in a custom form without the core
    // ids/classes. Hide only forms that actually contain a message composer.
    for (const form of root.querySelectorAll("form")) {
      if (form.querySelector("textarea#chat-message, textarea[name='message'], input[name='message'], [contenteditable='true'][data-chat-input]")) {
        controls.add(form);
      }
    }

    // Older/newer Dice Tray templates can be recognized by their tray buttons
    // even when the outer class was modified by a theme.
    for (const button of root.querySelectorAll(".dice-tray__button, .dice-tray__roll")) {
      controls.add(button.closest(".dice-tray, #dice-tray, section, form") ?? button.parentElement);
    }

    for (const element of controls) {
      if (!(element instanceof Element)) continue;
      element.classList.toggle("mk-observer-chat-control-hidden", hidden);
      if (hidden) {
        element.style.setProperty("display", "none", "important");
        element.setAttribute("aria-hidden", "true");
      } else {
        element.style.removeProperty("display");
        element.removeAttribute("aria-hidden");
      }
    }
  }

  #observeChatControls(root) {
    if (!root || this.controlObservers.has(root)) return;

    const observer = new MutationObserver(() => this.#applyReadOnly(root));
    observer.observe(root, { childList: true, subtree: true });
    this.controlObservers.set(root, observer);
    this.#applyReadOnly(root);
  }

  #positionData() {
    return {
      left: Number(getSetting(SETTINGS.CHAT_LEFT)) || 0,
      top: Number(getSetting(SETTINGS.CHAT_TOP)) || 0,
      width: Math.max(280, Number(getSetting(SETTINGS.CHAT_WIDTH)) || 380),
      height: Math.max(240, Number(getSetting(SETTINGS.CHAT_HEIGHT)) || 600)
    };
  }

  #setPosition(app) {
    if (!app || typeof app.setPosition !== "function") return;
    try {
      app.setPosition(this.#positionData());
    } catch (error) {
      debug("Could not set chat window position", error);
    }
  }

  async #scrollToBottom(chat, popout) {
    try {
      if (typeof chat?.scrollBottom === "function") {
        await Promise.resolve(chat.scrollBottom({ popout: true }));
        return;
      }
      if (typeof popout?.scrollBottom === "function") {
        await Promise.resolve(popout.scrollBottom());
      }
    } catch (error) {
      debug("Could not scroll observer chat to bottom", error);
    }
  }
}
