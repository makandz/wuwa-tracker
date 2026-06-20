"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_SCREEN } from "./constants";
import { getHistoryScreenFromState, getInitialScreen } from "./navigation";
import type { Screen, TrackerHistoryState } from "./types";

export function useTrackerNavigation() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const initialScreenRef = useRef(screen);

  const navigateToScreen = useCallback((nextScreen: Screen, replace = false) => {
    setScreen(nextScreen);

    if (typeof window === "undefined") {
      return;
    }

    const nextState: TrackerHistoryState = {
      ...(window.history.state ?? {}),
      wuwaTrackerScreen: nextScreen,
    };

    if (replace) {
      window.history.replaceState(nextState, "", window.location.href);
      return;
    }

    window.history.pushState(nextState, "", window.location.href);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!getHistoryScreenFromState(window.history.state)) {
      window.history.replaceState(
        {
          ...(window.history.state ?? {}),
          wuwaTrackerScreen: initialScreenRef.current,
        } satisfies TrackerHistoryState,
        "",
        window.location.href,
      );
    }

    function handlePopState(event: PopStateEvent) {
      setScreen(getHistoryScreenFromState(event.state) ?? DEFAULT_SCREEN);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return {
    screen,
    navigateToScreen,
  };
}
