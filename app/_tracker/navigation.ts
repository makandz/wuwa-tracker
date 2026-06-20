import { DEFAULT_SCREEN } from "./constants";
import type { Screen, TrackerHistoryState } from "./types";

export function isScreen(value: unknown): value is Screen {
  if (!value || typeof value !== "object" || !("name" in value)) {
    return false;
  }

  const screen = value as Partial<Screen>;

  if (
    screen.name === "dashboard" ||
    screen.name === "add" ||
    screen.name === "inventory"
  ) {
    return true;
  }

  return screen.name === "detail" && typeof screen.id === "string";
}

export function getHistoryScreenFromState(state: unknown) {
  const maybeScreen = (state as TrackerHistoryState | null)?.wuwaTrackerScreen;
  return isScreen(maybeScreen) ? maybeScreen : null;
}

export function getInitialScreen() {
  if (typeof window === "undefined") {
    return DEFAULT_SCREEN;
  }

  return getHistoryScreenFromState(window.history.state) ?? DEFAULT_SCREEN;
}
