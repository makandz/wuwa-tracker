"use client";

import { useEffect, useRef, useState } from "react";

import {
  readStoredCharacters,
  readStoredBackupNoticeAcknowledgedAt,
  readStoredMatrixTeams,
  readStoredWelcomeSeen,
  readStoredWeaponInventory,
  writeStoredBackupNoticeAcknowledgedAt,
  writeStoredCharacters,
  writeStoredMatrixTeams,
  writeStoredWelcomeSeen,
  writeStoredWeaponInventory,
} from "./storage";
import type { MatrixTeam, TrackedCharacter, WeaponInventoryItem } from "./types";

export function usePersistedTrackerState() {
  const [characters, setCharacters] = useState<TrackedCharacter[]>([]);
  const [weaponInventory, setWeaponInventory] = useState<WeaponInventoryItem[]>([]);
  const [matrixTeams, setMatrixTeams] = useState<MatrixTeam[]>([]);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [backupNoticeAcknowledgedAt, setBackupNoticeAcknowledgedAt] = useState(0);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const storageLoadedRef = useRef(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      storageLoadedRef.current = true;
      setCharacters(readStoredCharacters());
      setWeaponInventory(readStoredWeaponInventory());
      setMatrixTeams(readStoredMatrixTeams());
      setWelcomeSeen(readStoredWelcomeSeen());
      setBackupNoticeAcknowledgedAt(readStoredBackupNoticeAcknowledgedAt());
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

  useEffect(() => {
    if (!storageLoadedRef.current) {
      return;
    }

    writeStoredWelcomeSeen(welcomeSeen);
  }, [welcomeSeen]);

  useEffect(() => {
    if (!storageLoadedRef.current) {
      return;
    }

    writeStoredBackupNoticeAcknowledgedAt(backupNoticeAcknowledgedAt);
  }, [backupNoticeAcknowledgedAt]);

  return {
    characters,
    setCharacters,
    weaponInventory,
    setWeaponInventory,
    matrixTeams,
    setMatrixTeams,
    welcomeSeen,
    setWelcomeSeen,
    backupNoticeAcknowledgedAt,
    setBackupNoticeAcknowledgedAt,
    storageLoaded,
  };
}
