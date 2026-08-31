"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "veyro_balance_hidden";

/**
 * Shared hide/unhide toggle for wallet balance amounts, kept in sync
 * across every component that shows one (Home's balance card, the
 * Assets page's balance card and asset rows) without prop drilling or a
 * context provider: a module-level store plus useSyncExternalStore, so
 * toggling in one mounted component is instantly reflected in any other
 * mounted at the same time.
 *
 * Persisted to sessionStorage so the choice also survives navigating
 * between Home and Assets (separate route mounts, not just separate
 * components on one page) within the same browser session. Deliberately
 * not persisted beyond the session (no localStorage, no backend field):
 * there's no user-preference column for this yet, and a balance visibly
 * hidden on someone else's return visit to a previously-open tab is a
 * reasonable session-only default until real settings storage exists.
 */
let hidden = false;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  try {
    hidden = sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    hidden = false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureInitialized();
  return hidden;
}

function getServerSnapshot() {
  return false;
}

function setHidden(next: boolean) {
  hidden = next;
  initialized = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Private browsing or storage disabled: the toggle still works for
    // the current mount via the in-memory store, it just won't survive
    // a navigation. Not worth surfacing an error for.
  }
  listeners.forEach((listener) => listener());
}

export function useBalanceVisibility(): [boolean, () => void] {
  const isHidden = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return [isHidden, () => setHidden(!getSnapshot())];
}
