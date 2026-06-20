"use client";

import { useEffect, useRef, useState } from "react";

import {
  readStoredCharacters,
  readStoredWeaponInventory,
  writeStoredCharacters,
  writeStoredWeaponInventory,
} from "./storage";
import type { TrackedCharacter, WeaponInventoryItem } from "./types";

export function usePersistedTrackerState() {
  const [characters, setCharacters] = useState<TrackedCharacter[]>([]);
  const [weaponInventory, setWeaponInventory] = useState<WeaponInventoryItem[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const storageLoadedRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      storageLoadedRef.current = true;
      setCharacters(readStoredCharacters());
      setWeaponInventory(readStoredWeaponInventory());
      setStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!storageLoadedRef.current) {
      return;
    }

    writeStoredCharacters(characters);
  }, [characters]);

  useEffect(() => {
    if (!storageLoadedRef.current) {
      return;
    }

    writeStoredWeaponInventory(weaponInventory);
  }, [weaponInventory]);

  return {
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    storageLoaded,
  };
}
