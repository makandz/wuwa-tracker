import { emptyChecklist, MAX_ECHO_SETS } from "./constants";
import type { EchoCheckerEcho, EchoSet, TrackedCharacter } from "./types";

/** Creates independent empty selections for one echo position. */
function createEmptyEcho(): EchoCheckerEcho {
  return {
    critRate: null,
    critDmg: null,
    substatIds: [null, null, null, null, null],
    prioritySubstatIds: [null, null, null, null, null],
  };
}

/**
 * Creates an independent checklist set that can later use detailed tracking.
 * @param id - The stable set ID within its character.
 * @param name - The display name.
 * @returns An empty echo set.
 */
export function createEchoSet(id: string, name = "Default"): EchoSet {
  return {
    id,
    name,
    mode: "checklist",
    scoring: "strict-crit",
    actualEr: null,
    checklist: { ...emptyChecklist },
    echoes: {
      fourCost: createEmptyEcho(),
      threeCostA: createEmptyEcho(),
      threeCostB: createEmptyEcho(),
      oneCostA: createEmptyEcho(),
      oneCostB: createEmptyEcho(),
    },
  };
}

/**
 * Adds a new or duplicated set without sharing mutable echo data.
 * @param character - The character receiving the set.
 * @param id - The new set's stable ID.
 * @param sourceId - An existing set to duplicate, when requested.
 * @returns The updated character.
 */
export function addEchoSet(character: TrackedCharacter, id: string, sourceId?: string) {
  if (character.echoSets.length >= MAX_ECHO_SETS) {
    throw new Error("A character can have at most three echo sets.");
  }

  if (character.echoSets.some((set) => set.id === id)) {
    throw new Error("Echo set IDs must be unique.");
  }

  const source = character.echoSets.find((set) => set.id === sourceId);

  if (sourceId && !source) {
    throw new Error("The echo set to duplicate was not found.");
  }

  const echoSet = source
    ? { ...structuredClone(source), id, name: `${source.name} copy` }
    : createEchoSet(id, `Set ${character.echoSets.length + 1}`);

  return { ...character, echoSets: [...character.echoSets, echoSet] };
}

/**
 * Updates one set while retaining the character's other sets and shared settings.
 * @param character - The owning character.
 * @param echoSet - The replacement set with its existing ID.
 * @returns The updated character.
 */
export function updateEchoSet(character: TrackedCharacter, echoSet: EchoSet) {
  if (!character.echoSets.some((set) => set.id === echoSet.id)) {
    throw new Error("The echo set was not found.");
  }

  return {
    ...character,
    echoSets: character.echoSets.map((set) => set.id === echoSet.id ? echoSet : set),
  };
}

/**
 * Removes a set while ensuring every character retains at least one.
 * @param character - The owning character.
 * @param id - The set to remove.
 * @returns The updated character.
 */
export function deleteEchoSet(character: TrackedCharacter, id: string) {
  if (!character.echoSets.some((set) => set.id === id)) {
    throw new Error("The echo set was not found.");
  }

  if (character.echoSets.length === 1) {
    throw new Error("A character must retain at least one echo set.");
  }

  return { ...character, echoSets: character.echoSets.filter((set) => set.id !== id) };
}
