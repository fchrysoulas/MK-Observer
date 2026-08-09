# Changelog

All notable changes to MK-Observer are documented in this file.

## [0.5.5]

### Changed

- Scene-limit margins now act as fixed screen-space padding on the locked observer viewport at every zoom level.
- Pixel-based numeric settings now use one-pixel increments.

## [0.5.4]

### Changed

- Scene-limit margins now accept values from -500 to 500 pixels; negative values expand a camera limit outward and positive values move it inward.

## [0.5.3]

### Added

- Added independent top, bottom, left, and right scene-limit margins in pixels.

### Fixed

- Restored the Floating Chat Window on Foundry VTT v13 and v14 by resolving the supported chat UI and sidebar popout references.

### Changed

- Updated the MIT license copyright attribution.

## [0.5.2]

### Changed

- Dropped Foundry VTT v12 compatibility; MK-Observer now requires Foundry VTT v13 or v14.

## [0.5.1]

### Added

- Added an optional observer-only scene camera limit that constrains pan and zoom to the active scene.

## [0.5.0]

### Changed

- Added installation through the Foundry VTT module manifest.
- Updated release downloads to use versioned GitHub release assets.
- Clarified the manual installation steps in the README.

## [0.4.0]

### Added

- Initial public release of MK-Observer.
- Observer camera modes for automatic, GM-directed, and manual operation.
- Manual token and group tracking from the Token HUD.
- Floating Chat Window and Detached Browser Window support, with v12 and v13 fallbacks.
- Observer-only controls for hiding chat inputs and Dice So Nice 3D dice.
