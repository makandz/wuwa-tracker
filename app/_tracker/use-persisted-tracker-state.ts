"use client";

import { useEffect, useRef, useState } from "react";

import {
  readStoredCharacters,
  readStoredMatrixTeams,
  readStoredWeaponInventory,
  writeStoredCharacters,
  writeStoredMatrixTeams,
  writeStoredWeaponInventory,
} from "./storage";
import type { MatrixTeam, TrackedCharacter, WeaponInventoryItem } from "./types";

export function usePersistedTrackerState() {
  const [characters, setCharacters] = useState<TrackedCharacter[]>([]);
  const [weaponInventory, setWeaponInventory] = useState<WeaponInventoryItem[]>([]);
  const [matrixTeams, setMatrixTeams] = useState<MatrixTeam[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const storageLoadedRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      storageLoadedRef.current = true;
      setCharacters(readStoredCharacters());
      setWeaponInventory(readStoredWeaponInventory());
      setMatrixTeams(readStoredMatrixTeams());
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

  useEffect(() => {
    if (!storageLoadedRef.current) {
      return;
    }

    writeStoredMatrixTeams(matrixTeams);
  }, [matrixTeams]);

  return {
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    matrixTeams,
    setMatrixTeams,
    storageLoaded,
  };
}
