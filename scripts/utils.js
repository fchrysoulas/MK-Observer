import { MODULE_ID, SETTINGS } from "./constants.js";

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getSetting(key) {
  return game.settings.get(MODULE_ID, key);
}

export function localize(key) {
  return game.i18n.localize(`${MODULE_ID}.${key}`);
}

export function format(key, data = {}) {
  return game.i18n.format(`${MODULE_ID}.${key}`, data);
}

export function isObserverClient() {
  const observerId = getSetting(SETTINGS.OBSERVER_USER_ID);
  return Boolean(observerId && game.user?.id === observerId);
}

export function getObserverUser() {
  const observerId = getSetting(SETTINGS.OBSERVER_USER_ID);
  return observerId ? game.users?.get(observerId) ?? null : null;
}

export function isActiveGM(userId) {
  const user = game.users?.get(userId);
  return Boolean(user?.isGM && user.active);
}

export function getRootElement(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html[0] instanceof HTMLElement) return html[0];
  if (html.element instanceof HTMLElement) return html.element;
  if (html.element?.[0] instanceof HTMLElement) return html.element[0];
  return null;
}

export function debug(...args) {
  if (!game.settings?.settings?.has(`${MODULE_ID}.${SETTINGS.DEBUG}`)) return;
  if (!getSetting(SETTINGS.DEBUG)) return;
  console.debug(`${MODULE_ID} |`, ...args);
}

export function tokenHasPlayerOwner(token) {
  const actor = token?.actor;
  if (!actor) return false;

  const observerId = getSetting(SETTINGS.OBSERVER_USER_ID);
  return game.users.some((user) => {
    if (user.isGM || user.id === observerId) return false;
    return actor.testUserPermission(user, "OWNER");
  });
}

export function isTrackedToken(token) {
  return Boolean(token?.document?.getFlag(MODULE_ID, "tracked"));
}

export function tokenIsEligible(token) {
  if (!token?.document) return false;
  if (!getSetting(SETTINGS.IGNORE_HIDDEN)) return true;
  if (token.document.hidden) return false;
  return token.isVisible !== false;
}
