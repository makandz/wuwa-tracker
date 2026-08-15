import {
  PRYDWEN_CHARACTER_BASE_URL,
  PRYDWEN_CHARACTER_SLUG_OVERRIDES,
  STANDARD_FIVE_STAR_WEAPONS,
  TETHYS_CHARACTER_BASE_URL,
} from "../constants";
import type {
  ApiCharacter,
  ApiWeapon,
  CharacterBadgeTone,
  TrackedCharacter,
  WeaponRarityTone,
} from "../types";

const CHARACTER_RARITY_OVERRIDES: Record<
  string,
  {
    qualityId: number;
    badgeTone?: CharacterBadgeTone;
    animatedBadge?: boolean;
  }
> = {
  aalto: {
    qualityId: 6,
    animatedBadge: true,
  },
  roccia: {
    qualityId: 4,
  },
  brant: {
    qualityId: 2,
    badgeTone: "blue",
  },
};

export function getPrydwenCharacterUrl(characterName: string) {
  const overrideSlug = PRYDWEN_CHARACTER_SLUG_OVERRIDES[characterName];
  const slug =
    overrideSlug ??
    characterName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return `${PRYDWEN_CHARACTER_BASE_URL}/${slug}`;
}

export function getTethysCharacterUrl(characterId: number) {
  return `${TETHYS_CHARACTER_BASE_URL}/${characterId}`;
}

export function slugifyCharacterName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTrackedCharacterSlug(character: TrackedCharacter) {
  return slugifyCharacterName(character.characterName) || String(character.characterId);
}

function hasDuplicateCharacterSlug(
  character: TrackedCharacter,
  characters: TrackedCharacter[],
) {
  const slug = getTrackedCharacterSlug(character);

  return characters.some(
    (item) => item.id !== character.id && getTrackedCharacterSlug(item) === slug,
  );
}

export function getTrackedCharacterRouteSegment(
  character: TrackedCharacter,
  characters: TrackedCharacter[],
) {
  const slug = getTrackedCharacterSlug(character);

  return hasDuplicateCharacterSlug(character, characters)
    ? `${slug}-${character.characterId}`
    : slug;
}

export function findTrackedCharacterByRouteSegment(
  routeSegment: string,
  characters: TrackedCharacter[],
) {
  let decodedRouteSegment = routeSegment;

  try {
    decodedRouteSegment = decodeURIComponent(routeSegment);
  } catch {
    return null;
  }

  return (
    characters.find((character) => character.id === decodedRouteSegment) ??
    characters.find(
      (character) =>
        getTrackedCharacterRouteSegment(character, characters) === decodedRouteSegment,
    ) ??
    characters.find(
      (character) => getTrackedCharacterSlug(character) === decodedRouteSegment,
    ) ??
    null
  );
}

export function normalizeCharacterName(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase();
}

export function getCharacterRarityDisplay({
  name,
  qualityId,
}: {
  name?: string | null;
  qualityId?: number | null;
}) {
  const override = CHARACTER_RARITY_OVERRIDES[normalizeCharacterName(name)];

  return {
    qualityId: override?.qualityId ?? qualityId,
    badgeTone: override?.badgeTone,
    animatedBadge: override?.animatedBadge ?? false,
  };
}

export function findCatalogCharacter(
  characters: ApiCharacter[],
  characterId: number,
) {
  return characters.find((character) => character.Id === characterId) ?? null;
}

export function buildCatalogCharacterLookup(characters: ApiCharacter[]) {
  return new Map(characters.map((character) => [character.Id, character]));
}

export function findCatalogWeapon(weapons: ApiWeapon[], weaponId: number | null) {
  if (!weaponId) {
    return null;
  }

  return weapons.find((weapon) => weapon.Id === weaponId) ?? null;
}

export function buildCatalogWeaponLookup(weapons: ApiWeapon[]) {
  return new Map(weapons.map((weapon) => [weapon.Id, weapon]));
}

export function getTrackedCharacterDisplay(
  character: TrackedCharacter,
  catalogCharacter?: ApiCharacter | null,
) {
  const name = catalogCharacter?.Name ?? character.characterName;
  const rarityDisplay = getCharacterRarityDisplay({
    name,
    qualityId: catalogCharacter?.QualityId,
  });

  return {
    name,
    icon: catalogCharacter?.RoleHeadIcon ?? "",
    qualityId: rarityDisplay.qualityId ?? null,
    badgeTone: rarityDisplay.badgeTone,
    animatedBadge: rarityDisplay.animatedBadge,
    elementName: catalogCharacter?.Element?.Name ?? "",
    weaponTypeId: catalogCharacter?.WeaponType?.Id ?? 0,
    weaponTypeName: catalogCharacter?.WeaponType?.Name ?? "",
  };
}

export function getTrackedWeaponDisplay(
  character: TrackedCharacter,
  catalogWeapon?: ApiWeapon | null,
) {
  return {
    name: catalogWeapon?.Name ?? character.weaponName,
    icon: catalogWeapon?.Icon ?? "",
    qualityId: catalogWeapon?.QualityId ?? null,
    typeName: catalogWeapon?.TypeName ?? "",
  };
}

export function normalizeWeaponName(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase();
}

export function getWeaponRarityTone({
  name,
  qualityId,
}: {
  name?: string | null;
  qualityId?: number | null;
}): WeaponRarityTone {
  if (qualityId === 3) {
    return "blue";
  }

  if (qualityId === 4) {
    return "purple";
  }

  if (qualityId === 5) {
    return STANDARD_FIVE_STAR_WEAPONS.has(normalizeWeaponName(name))
      ? "standardGold"
      : "limitedGold";
  }

  return "neutral";
}
