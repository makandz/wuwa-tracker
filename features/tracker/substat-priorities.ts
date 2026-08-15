import substatPriorities from "./data/substat-priorities.json";

const prioritiesByCharacterId: Readonly<Record<string, string>> = substatPriorities;

export function getCharacterSubstatPriority(characterId: number): string | null {
  return prioritiesByCharacterId[String(characterId)] ?? null;
}
