import { ROLES } from "../constants";
import {
  buildCatalogCharacterLookup,
  buildCatalogWeaponLookup,
  characterRoleToneClasses,
  checklistTotal,
  formatRatingValue,
  getEffectiveChecklist,
  getPrimaryRole,
  getRatings,
  getRoleSummary,
  getTrackedCharacterDisplay,
  getTrackedWeaponDisplay,
  getWeaponInventoryStatus,
  getWeaponRarityTone,
  getWeaponToneClasses,
  isEchoCheckerEnabled,
  isComplete,
  sortDashboardCharacters,
} from "../domain";
import { TRACKER_DOCUMENT_STORAGE_KEY } from "../storage/keys";
import type {
  ApiCharacter,
  ApiWeapon,
  Catalog,
  DashboardSortKey,
  TrackedCharacter,
  WeaponFilter,
  WeaponInventoryItem,
} from "../types";

export type DashboardCatalogLookups = {
  catalogCharacterById: Map<number, ApiCharacter>;
  catalogWeaponById: Map<number, ApiWeapon>;
};

export function buildDashboardCatalogLookups(catalog: Catalog): DashboardCatalogLookups {
  return {
    catalogCharacterById: buildCatalogCharacterLookup(catalog.characters),
    catalogWeaponById: buildCatalogWeaponLookup(catalog.weapons),
  };
}

export function getDashboardStats({
  characters,
  storageVersion,
  weaponInventory,
}: {
  characters: TrackedCharacter[];
  storageVersion: number | null;
  weaponInventory: WeaponInventoryItem[];
}) {
  const completeCount = characters.filter(isComplete).length;
  const critScoredCharacters = characters.filter((character) => !character.noCrit);
  const validBuildScores = critScoredCharacters
    .map((character) => getRatings(character).buildScore)
    .filter((score): score is number => score !== null);
  const averageBuildScore =
    validBuildScores.length > 0
      ? validBuildScores.reduce((sum, score) => sum + score, 0) / validBuildScores.length
      : null;
  const averageBuildScoreValue =
    characters.length === 0
      ? "0.00"
      : averageBuildScore !== null
        ? formatRatingValue(averageBuildScore)
        : critScoredCharacters.length === 0
          ? "No crit"
          : formatRatingValue(null);
  const totalWeaponCopies = weaponInventory.reduce((sum, item) => sum + item.count, 0);

  return {
    completeCount,
    hasWeaponCopies: totalWeaponCopies > 0,
    items: [
      { label: "Tracked", value: String(characters.length) },
      { label: "Complete", value: `${completeCount}/${characters.length}` },
      { label: "Avg build", value: averageBuildScoreValue },
      { label: "Weapon copies", value: String(totalWeaponCopies) },
      {
        label: "Storage",
        title: TRACKER_DOCUMENT_STORAGE_KEY,
        value: storageVersion ? `v${storageVersion}` : "Local",
      },
    ],
    totalWeaponCopies,
  };
}

export function filterDashboardCharacters({
  assignmentCounts,
  catalogCharacterById,
  catalogWeaponById,
  characters,
  hideComplete,
  query,
  weaponFilter,
  weaponInventory,
}: {
  assignmentCounts: Record<number, number>;
  catalogCharacterById: Map<number, ApiCharacter>;
  catalogWeaponById: Map<number, ApiWeapon>;
  characters: TrackedCharacter[];
  hideComplete: boolean;
  query: string;
  weaponFilter: WeaponFilter;
  weaponInventory: WeaponInventoryItem[];
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return characters.filter((character) => {
    const characterDisplay = getTrackedCharacterDisplay(
      character,
      catalogCharacterById.get(character.characterId),
    );
    const weaponDisplay = getTrackedWeaponDisplay(
      character,
      catalogWeaponById.get(character.weaponId ?? 0),
    );

    if (hideComplete && isComplete(character)) {
      return false;
    }

    const weaponStatus = getWeaponInventoryStatus({
      weaponId: character.weaponId,
      inventory: weaponInventory,
      assignmentCounts,
    });

    if (weaponFilter === "selected" && !character.weaponId) {
      return false;
    }

    if (weaponFilter === "missing" && character.weaponId) {
      return false;
    }

    if (weaponFilter === "attention" && !weaponStatus) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      characterDisplay.name,
      characterDisplay.elementName,
      characterDisplay.weaponTypeName,
      weaponDisplay.name,
      character.roles.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function groupDashboardCharacters(
  visibleCharacters: TrackedCharacter[],
  sortKey: DashboardSortKey,
) {
  return ROLES.map((role) => {
    const characters = sortDashboardCharacters(
      visibleCharacters.filter((character) => getPrimaryRole(character.roles) === role),
      sortKey,
    );

    return {
      role,
      characters,
      summary: getRoleSummary(characters),
    };
  }).filter((group) => group.characters.length > 0);
}

export function getDashboardCharacterCardState({
  assignmentCounts,
  catalogCharacterById,
  catalogWeaponById,
  character,
  weaponInventory,
}: {
  assignmentCounts: Record<number, number>;
  catalogCharacterById: Map<number, ApiCharacter>;
  catalogWeaponById: Map<number, ApiWeapon>;
  character: TrackedCharacter;
  weaponInventory: WeaponInventoryItem[];
}) {
  const catalogCharacter = catalogCharacterById.get(character.characterId) ?? null;
  const catalogWeapon = catalogWeaponById.get(character.weaponId ?? 0) ?? null;
  const characterDisplay = getTrackedCharacterDisplay(character, catalogCharacter);
  const weaponDisplay = getTrackedWeaponDisplay(character, catalogWeapon);
  const complete = isComplete(character);
  const primaryRole = getPrimaryRole(character.roles);
  const characterToneClasses = characterRoleToneClasses(primaryRole, complete);
  const effectiveChecklist = getEffectiveChecklist(character);
  const checklistCount = checklistTotal(effectiveChecklist);
  const ratings = getRatings(character);
  const weaponStatus = getWeaponInventoryStatus({
    weaponId: character.weaponId,
    inventory: weaponInventory,
    assignmentCounts,
  });
  const weaponTone = getWeaponRarityTone({
    name: weaponDisplay.name,
    qualityId: weaponDisplay.qualityId,
  });
  const weaponToneClasses = getWeaponToneClasses(weaponTone);
  const erBelowTarget =
    character.expectedEr > 0 && character.actualEr < character.expectedEr;
  const echoTrackerEnabled = isEchoCheckerEnabled(character);

  return {
    characterToneClasses,
    catalogCharacter,
    characterDisplay,
    checklistCount,
    complete,
    echoTrackerEnabled,
    effectiveChecklist,
    erBelowTarget,
    ratings,
    weaponDisplay,
    weaponStatus,
    weaponToneClasses,
  };
}
