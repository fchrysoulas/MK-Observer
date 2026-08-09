# MK-Observer v0.5.5

MK-Observer is a lightweight observer and stream-view module for Foundry Virtual Tabletop v13–v14.

See [CHANGELOG.md](CHANGELOG.md) for release history.

## What it does

- Provides a dedicated observer/stream user.
- Offers automatic, directed, or disabled camera modes.
- Supports manual token/group tracking from the Token HUD.
- Includes optional observer chat as a floating or detached window.
- Preserves chat content while optionally hiding Dice So Nice 3D dice and chat controls.
- Works without extra module dependencies.

## Installation

### Install from the module manifest

1. Open Foundry VTT and select **Add-on Modules**.
2. Click **Install Module**.
3. Paste this URL into **Manifest URL**:

   ```text
   https://github.com/fchrysoulas/MK-Observer/releases/latest/download/module.json
   ```

4. Click **Install**, then enable **MK-Observer** in your world.

### Install manually

1. Download and extract the module into `FoundryVTT/Data/modules/mk-observer/`.
2. Restart Foundry VTT.
3. Enable **MK-Observer** in your world.

## Setup

1. Create a dedicated non-GM user such as `Observer` or `Stream`.
2. Grant that user **Observer** permission for every player actor whose tokens should provide vision.
3. Open **Configure Settings → Module Settings → MK-Observer**.
4. Select the dedicated user under **Observer User**.
5. Choose the camera mode and smoothing values.
6. Configure **Observer Chat Window** if chat should appear separately.
7. Reload Foundry after changing observer or interface settings.
8. Log in as that user from OBS, another browser profile, or a second device.

## Camera modes

### Automatic

Frames manual tracked tokens first. If none are tracked, frames the current combatant during combat or all visible player-owned tokens.

### Directed

Follows the GM camera target through cinematic smoothing. For stable results, only one GM should move the camera at a time.

### Disabled

The observer camera stays manual and never moves automatically.

## Observer scene limits

Enable **Limit Observer Camera to Scene** to keep only the **Observer User** inside the active scene's bounds. It prevents manual pan and zoom from exposing the padded canvas, and constrains both Automatic and Directed camera targets. Optional top, bottom, left, and right margins range from -500 to 500 screen pixels and act as padding on the visible viewport at every zoom level. Positive values keep the view farther inside an edge; negative values permit the view beyond it. The setting may zoom in as needed to satisfy those boundaries; GMs and other players are unaffected.

## Observer chat window modes

### Disabled

No separate chat window is opened. Sidebar visibility is controlled by **Show Sidebar**.

### Floating Chat Window

Opens the chat log as a movable Foundry popout. Supported in v13 and v14.

### Detached Browser Window

On Foundry v14, the chat popout can detach into its own native browser window for capture or monitor placement. On v13, MK-Observer uses the Floating Chat Window.

Control the popout layout with:

- **Chat Window Width**
- **Chat Window Height**
- **Chat Window Left Position**
- **Chat Window Top Position**
- **Hide Chat User Controls**

### Chat controls and Dice So Nice

- **Hide Dice So Nice 3D Dice** removes the animated dice layer while keeping roll cards visible.
- **Hide Chat User Controls** removes the composer, toolbar, and Dice Tray controls but preserves messages and roll cards.

## Cinematic smoothing

MK-Observer uses a continuous camera spring and updates the canvas every frame.

- **Cinematic Reaction Delay**: delay before automatic framing responds.
- **Pan Smooth Time**: smoothing for camera position.
- **Zoom Smooth Time**: smoothing for zoom.
- **Pan Dead Zone**: ignores small position changes.
- **Zoom Dead Zone**: ignores small zoom changes.
- **Maximum Pan Speed**: movement speed cap.
- **Maximum Zoom Speed**: zoom speed cap.
- **Directed Sample Interval**: how often GM camera targets are sent.

Recommended starting values:

- Reaction Delay: `180 ms`
- Pan Smooth Time: `650 ms`
- Zoom Smooth Time: `900 ms`
- Pan Dead Zone: `24 px`
- Zoom Dead Zone: `1%`
- Maximum Pan Speed: `1400 px/s`
- Maximum Zoom Speed: `0.8 scale/s`
- Directed Sample Interval: `50 ms`

## Manual tracking

As GM, open the Token HUD and press the camera button for any token. If the selected token is part of the current controlled selection, the whole selection is tracked. Press the button again to stop tracking.

## API

```js
// Recalculate the observer camera locally, when run by the observer user.
game.modules.get("mk-observer").api.focus();

// Ask the observer client to recalculate its automatic camera.
game.modules.get("mk-observer").api.requestObserverFocus();

// Clear all manual tracking flags from the current scene as GM.
await game.modules.get("mk-observer").api.clearTrackedTokens();

// Open or close the configured observer chat window locally.
await game.modules.get("mk-observer").api.openChatWindow();
await game.modules.get("mk-observer").api.closeChatWindow();
```

## Compatibility

- Minimum: Foundry VTT v13
- Verified target: Foundry VTT v14
- Maximum: Foundry VTT v14

Chat behavior uses the v13+ sidebar popout API, with native detached windows available only when v14 exposes `detachWindow()`.
