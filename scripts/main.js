import { MODULE_ID, MODULE_VERSION } from "./constants.js";
import { ObserverCamera } from "./camera.js";
import { ObserverChatWindow } from "./chat-window.js";
import { registerSettings, refreshObserverChoices } from "./settings.js";
import { ObserverSocket } from "./socket.js";
import { ObserverUI } from "./ui.js";

let camera;
let socket;
let uiController;
let chatWindow;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing v${MODULE_VERSION}`);
  registerSettings();
});

Hooks.once("setup", () => {
  camera = new ObserverCamera();
  socket = new ObserverSocket(camera);
  uiController = new ObserverUI(socket, camera);
  chatWindow = new ObserverChatWindow();

  camera.setup();
  socket.setup();
  uiController.setup();
  chatWindow.setup();
});

Hooks.once("ready", () => {
  refreshObserverChoices();

  game.modules.get(MODULE_ID).api = {
    focus: (options = { force: true }) => camera?.scheduleFocus({ immediate: true, ...options }),
    requestObserverFocus: () => socket?.requestFocus(),
    clearTrackedTokens: () => uiController?.clearTrackedTokens(),
    openChatWindow: () => chatWindow?.open(),
    closeChatWindow: () => chatWindow?.close()
  };
});
