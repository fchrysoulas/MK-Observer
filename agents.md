# Agents Guide for MK-Observer

This repository is a Foundry VTT module for observer and stream camera control.

## Purpose

`MK-Observer` provides an observer user experience that includes:

- automatic or directed camera framing
- manual token/group tracking
- optional floating or detached observer chat windows
- support for Foundry VTT v12 through v14

## Repository layout

- `README.md` — module overview, installation, setup, and compatibility.
- `module.json` — Foundry module manifest.
- `lang/` — English and Greek localization files.
- `scripts/` — module code and UI scripts.
- `styles/` — module styles for observer interface.

## Working with this repo

- Keep the README concise and focused on installation, setup, camera modes, chat modes, and compatibility.
- Preserve user-facing terminology such as `Observer User`, `Floating Chat Window`, `Detached Browser Window`, and `Hide Dice So Nice 3D Dice`.
- Avoid adding extra module dependencies unless the feature requires it.
- Test against Foundry v12, v13, and v14 if possible; use stable APIs across versions.

## Notes for AI agents

- Use concise edits and keep documentation aligned with the existing module behavior.
- Prefer clarity over exhaustive detail in user-facing docs.
- Match the repository style: simple markdown with clear sections and short bullet lists.
