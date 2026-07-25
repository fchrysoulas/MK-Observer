# MK-Observer Agent Guide

## Project overview

MK-Observer is a Foundry VTT module for observer and stream camera control. Its core features are:

- automatic and GM-directed camera framing
- manual token and group tracking
- optional floating or detached observer chat windows
- compatibility with Foundry VTT v12 through v14

## Repository map

- `README.md` — installation, setup, features, and compatibility
- `module.json` — module metadata, compatibility, and distribution URLs
- `lang/` — English and Greek localization
- `scripts/` — module logic and user interface code
- `styles/` — observer interface styles

## Development principles

- Keep changes focused and avoid unrelated refactors.
- Prefer Foundry APIs that remain stable across v12, v13, and v14.
- Avoid new module dependencies unless a feature requires one.
- Preserve existing behavior unless the requested change explicitly replaces it.
- Keep user-facing strings localized in both `lang/en.json` and `lang/el.json`.

## User-facing terminology

Use these labels consistently in code, localization, and documentation:

- `Observer User`
- `Floating Chat Window`
- `Detached Browser Window`
- `Hide Dice So Nice 3D Dice`

## Change workflow

1. Inspect the relevant code, styles, localization, manifest, and documentation before editing.
2. Make the smallest complete change that satisfies the request.
3. Update both language files when adding or changing user-facing text.
4. Keep `README.md` and `module.json` aligned with actual module behavior.
5. Check for syntax errors and review the final diff.

## Validation

- Test against Foundry VTT v12, v13, and v14 when possible.
- Verify observer-only behavior with a dedicated non-GM user.
- Exercise Automatic, Directed, and Disabled camera modes when camera logic changes.
- Check both Floating Chat Window and Detached Browser Window behavior when chat logic changes.
- Confirm v12 and v13 fallbacks when using APIs introduced in v14.

If full Foundry testing is unavailable, perform relevant static checks and clearly report what was not tested.

## Documentation style

- Keep the README concise and focused on installation, setup, camera modes, chat modes, and compatibility.
- Use simple Markdown with clear sections and short bullet lists.
- Prefer clarity over exhaustive implementation detail.
- Document only behavior that exists in the current module.
