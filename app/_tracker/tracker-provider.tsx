"use client";

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { Catalog, TrackedCharacter, WeaponInventoryItem } from "./types";
import { useCatalog } from "./use-catalog";
import { usePersistedTrackerState } from "./use-persisted-tracker-state";

type TrackerContextValue = {
  catalog: Catalog;
  characters: TrackedCharacter[];
  setCharacters: Dispatch<SetStateAction<TrackedCharacter[]>>;
  weaponInventory: WeaponInventoryItem[];
  setWeaponInventory: Dispatch<SetStateAction<WeaponInventoryItem[]>>;
  storageLoaded: boolean;
};

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalog();
  const {
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    storageLoaded,
  } = usePersistedTrackerState();

  return (
    <TrackerContext.Provider
      value={{
        catalog,
        characters,
        setCharacters,
        weaponInventory,
        setWeaponInventory,
        storageLoaded,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
}

export function useTrackerData() {
  const value = useContext(TrackerContext);

  if (!value) {
    throw new Error("useTrackerData must be used within TrackerProvider.");
  }

  return value;
}
