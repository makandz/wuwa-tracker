import { getTrackedCharacterRouteSegment } from "./domain";
import type { MatrixTeam, TrackedCharacter, WeaponInventoryItem } from "./types";

export function getCharacterHref(
  character: TrackedCharacter,
  characters: TrackedCharacter[],
) {
  return `/characters/${encodeURIComponent(
    getTrackedCharacterRouteSegment(character, characters),
  )}`;
}

export function hasTrackerData(
  characters: TrackedCharacter[],
  weaponInventory: WeaponInventoryItem[],
  matrixTeams: MatrixTeam[],
) {
  return (
    characters.length > 0 ||
    weaponInventory.length > 0 ||
    matrixTeams.some((team) => team.slots.some(Boolean))
  );
}
