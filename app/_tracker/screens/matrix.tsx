"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";

import {
  getMatrixCharacterMaxUses,
  getRatingGrade,
  getRatings,
  normalizeCharacterName,
  ratingGradeClasses,
  rolePillClasses,
  sortDashboardCharacters,
} from "../domain";
import { ROLES } from "../constants";
import type { MatrixTeam, TrackedCharacter } from "../types";
import { CharacterAvatar, SearchInput, StatBlock, TextButton } from "../components/ui";

const EMPTY_SLOTS: MatrixTeam["slots"] = [null, null, null];

function createTeam(): MatrixTeam {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `team-${Date.now()}`,
    slots: [...EMPTY_SLOTS],
  };
}

function getLetterScore(character: TrackedCharacter) {
  const weighted = getRatings(character).weighted;

  return weighted === null ? null : getRatingGrade(weighted);
}

function getUsageCounts(teams: MatrixTeam[]) {
  const counts = new Map<string, number>();

  teams.forEach((team) => {
    team.slots.forEach((characterId) => {
      if (!characterId) {
        return;
      }

      counts.set(characterId, (counts.get(characterId) ?? 0) + 1);
    });
  });

  return counts;
}

function getTeamElementDiversity(
  team: MatrixTeam,
  characterById: Map<string, TrackedCharacter>,
) {
  const seenElements = new Set<string>();
  const elements: string[] = [];

  team.slots.forEach((characterId) => {
    const elementName = characterId ? characterById.get(characterId)?.elementName : null;
    const normalizedElementName = normalizeCharacterName(elementName);

    if (!elementName || !normalizedElementName || seenElements.has(normalizedElementName)) {
      return;
    }

    seenElements.add(normalizedElementName);
    elements.push(elementName);
  });

  return elements;
}

function getRoleSortIndex(character: TrackedCharacter) {
  const firstRole = character.roles[0];
  const roleIndex = firstRole ? ROLES.indexOf(firstRole) : -1;

  return roleIndex === -1 ? ROLES.length : roleIndex;
}

function getNextOpenSlot(
  teams: MatrixTeam[],
  teamId: string,
  fromSlotIndex: number,
) {
  const teamIndex = teams.findIndex((team) => team.id === teamId);

  if (teamIndex === -1) {
    return null;
  }

  for (let slotIndex = fromSlotIndex + 1; slotIndex < 3; slotIndex += 1) {
    if (!teams[teamIndex].slots[slotIndex]) {
      return { teamId, slotIndex };
    }
  }

  for (let nextTeamIndex = teamIndex + 1; nextTeamIndex < teams.length; nextTeamIndex += 1) {
    const slotIndex = teams[nextTeamIndex].slots.findIndex((slot) => !slot);

    if (slotIndex !== -1) {
      return { teamId: teams[nextTeamIndex].id, slotIndex };
    }
  }

  return null;
}

function hasAvailableCharacterForNewTeam(
  characters: TrackedCharacter[],
  teams: MatrixTeam[],
) {
  const usageCounts = getUsageCounts(teams);

  return characters.some(
    (character) =>
      (usageCounts.get(character.id) ?? 0) < getMatrixCharacterMaxUses(character),
  );
}

export function MatrixScreen({
  characters,
  teams,
  onBack,
  onUpdateTeams,
}: {
  characters: TrackedCharacter[];
  teams: MatrixTeam[];
  onBack: () => void;
  onUpdateTeams: (teams: MatrixTeam[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeSlot, setActiveSlot] = useState<{
    teamId: string;
    slotIndex: number;
  } | null>(null);
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);
  const characterIds = useMemo(
    () => new Set(characters.map((character) => character.id)),
    [characters],
  );
  const cleanedTeams = useMemo(
    () =>
      teams.map((team) => ({
        ...team,
        slots: team.slots.map((characterId) =>
          characterId && characterIds.has(characterId) ? characterId : null,
        ) as MatrixTeam["slots"],
      })),
    [characterIds, teams],
  );
  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );
  const usageCounts = useMemo(() => getUsageCounts(cleanedTeams), [cleanedTeams]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCharacters = useMemo(() => {
    const sorted = sortDashboardCharacters(characters, "weightDesc").sort(
      (a, b) => getRoleSortIndex(a) - getRoleSortIndex(b),
    );

    if (!normalizedQuery) {
      return sorted;
    }

    return sorted.filter((character) =>
      [
        character.characterName,
        character.elementName,
        character.weaponTypeName,
        character.roles.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [characters, normalizedQuery]);
  const availableCharacters = useMemo(
    () =>
      visibleCharacters.filter(
        (character) =>
          (usageCounts.get(character.id) ?? 0) < getMatrixCharacterMaxUses(character),
      ),
    [usageCounts, visibleCharacters],
  );
  const filledSlots = cleanedTeams.reduce(
    (sum, team) => sum + team.slots.filter(Boolean).length,
    0,
  );
  const fullTeams = cleanedTeams.filter((team) => team.slots.every(Boolean)).length;
  const resolvedActiveSlot =
    activeSlot && cleanedTeams.some((team) => team.id === activeSlot.teamId)
      ? activeSlot
      : cleanedTeams[0]
        ? { teamId: cleanedTeams[0].id, slotIndex: 0 }
        : null;

  useEffect(() => {
    if (teams === cleanedTeams) {
      return;
    }

    if (JSON.stringify(teams) !== JSON.stringify(cleanedTeams)) {
      onUpdateTeams(cleanedTeams);
    }
  }, [cleanedTeams, onUpdateTeams, teams]);

  function addTeam() {
    const team = createTeam();

    onUpdateTeams([...cleanedTeams, team]);
    setActiveSlot({ teamId: team.id, slotIndex: 0 });
  }

  function removeTeam(teamId: string) {
    const team = cleanedTeams.find((candidate) => candidate.id === teamId);

    if (!team) {
      return;
    }

    if (team.slots.some(Boolean) && !confirm("Remove this matrix team?")) {
      return;
    }

    const nextTeams = cleanedTeams.filter((candidate) => candidate.id !== teamId);

    onUpdateTeams(nextTeams.length > 0 ? nextTeams : [createTeam()]);
  }

  function reorderTeam(draggedId: string, targetId: string) {
    if (draggedId === targetId) {
      return;
    }

    const fromIndex = cleanedTeams.findIndex((team) => team.id === draggedId);
    const toIndex = cleanedTeams.findIndex((team) => team.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const nextTeams = [...cleanedTeams];
    const [movedTeam] = nextTeams.splice(fromIndex, 1);

    nextTeams.splice(toIndex, 0, movedTeam);
    onUpdateTeams(nextTeams);
  }

  function handleTeamDragStart(event: DragEvent<HTMLElement>, teamId: string) {
    setDraggedTeamId(teamId);
    setDragOverTeamId(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", teamId);
  }

  function handleTeamDragOver(event: DragEvent<HTMLDivElement>, teamId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTeamId(teamId);
  }

  function handleTeamDrop(event: DragEvent<HTMLDivElement>, targetTeamId: string) {
    event.preventDefault();

    const sourceTeamId = event.dataTransfer.getData("text/plain") || draggedTeamId;

    if (sourceTeamId) {
      reorderTeam(sourceTeamId, targetTeamId);
    }

    setDraggedTeamId(null);
    setDragOverTeamId(null);
  }

  function handleTeamDragEnd() {
    setDraggedTeamId(null);
    setDragOverTeamId(null);
  }

  function clearTeams() {
    if (filledSlots === 0 || !confirm("Clear all matrix teams?")) {
      return;
    }

    const team = createTeam();

    onUpdateTeams([team]);
    setActiveSlot({ teamId: team.id, slotIndex: 0 });
  }

  function clearSlot(teamId: string, slotIndex: number) {
    onUpdateTeams(
      cleanedTeams.map((team) =>
        team.id === teamId
          ? {
              ...team,
              slots: team.slots.map((characterId, index) =>
                index === slotIndex ? null : characterId,
              ) as MatrixTeam["slots"],
            }
          : team,
      ),
    );
    setActiveSlot({ teamId, slotIndex });
  }

  function canPlaceCharacter(character: TrackedCharacter) {
    if (!resolvedActiveSlot) {
      return false;
    }

    const activeTeam = cleanedTeams.find((team) => team.id === resolvedActiveSlot.teamId);

    if (!activeTeam) {
      return false;
    }

    const activeSlotCharacterId = activeTeam.slots[resolvedActiveSlot.slotIndex];
    const alreadyInTeam = activeTeam.slots.some(
      (characterId, slotIndex) =>
        slotIndex !== resolvedActiveSlot.slotIndex && characterId === character.id,
    );

    if (alreadyInTeam) {
      return false;
    }

    const usedCount =
      (usageCounts.get(character.id) ?? 0) - (activeSlotCharacterId === character.id ? 1 : 0);

    return usedCount < getMatrixCharacterMaxUses(character);
  }

  function placeCharacter(character: TrackedCharacter) {
    if (!resolvedActiveSlot || !canPlaceCharacter(character)) {
      return;
    }

    const nextTeams = cleanedTeams.map((team) =>
      team.id === resolvedActiveSlot.teamId
        ? {
            ...team,
            slots: team.slots.map((characterId, slotIndex) =>
              slotIndex === resolvedActiveSlot.slotIndex ? character.id : characterId,
            ) as MatrixTeam["slots"],
          }
        : team,
    );

    const nextOpenSlot = getNextOpenSlot(
      nextTeams,
      resolvedActiveSlot.teamId,
      resolvedActiveSlot.slotIndex,
    );
    const activeTeamIsFull = nextTeams
      .find((team) => team.id === resolvedActiveSlot.teamId)
      ?.slots.every(Boolean);

    if (
      !nextOpenSlot &&
      activeTeamIsFull &&
      hasAvailableCharacterForNewTeam(characters, nextTeams)
    ) {
      const newTeam = createTeam();

      onUpdateTeams([...nextTeams, newTeam]);
      setActiveSlot({ teamId: newTeam.id, slotIndex: 0 });
      return;
    }

    onUpdateTeams(nextTeams);
    setActiveSlot(nextOpenSlot);
  }

  return (
    <>
      <section className="border-b border-app-border/80 bg-app-surface">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-app-accent">Wuthering Waves</p>
              <h1 className="mt-1 text-3xl font-bold tracking-normal text-app-fg">
                Matrix Planner
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <TextButton onClick={onBack}>Build Tracker</TextButton>
              <TextButton onClick={addTeam} variant="primary">
                Add Team
              </TextButton>
              <TextButton onClick={clearTeams} variant="danger">
                Clear Teams
              </TextButton>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatBlock label="Teams" value={String(cleanedTeams.length)} />
            <StatBlock label="Complete" value={`${fullTeams}/${cleanedTeams.length}`} />
            <StatBlock label="Slots Filled" value={`${filledSlots}/${cleanedTeams.length * 3}`} />
            <StatBlock label="Roster" value={String(characters.length)} />
          </div>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-3 rounded-md border border-app-border/80 bg-app-surface p-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-app-fg">Available Characters</h2>
            </div>
            <div className="w-full sm:w-72">
              <SearchInput
                ariaLabel="Search matrix characters"
                compact
                onChange={setQuery}
                placeholder="Search characters"
                value={query}
              />
            </div>
          </div>

          {characters.length === 0 ? (
            <div className="rounded-md border border-dashed border-app-border bg-app-subtle p-6 text-center text-sm text-app-muted-subtle">
              No tracked characters yet.
            </div>
          ) : availableCharacters.length === 0 ? (
            <div className="rounded-md border border-dashed border-app-border bg-app-subtle p-6 text-center text-sm text-app-muted-subtle">
              No available characters match that search.
            </div>
          ) : (
            <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {availableCharacters.map((character) => {
                const letterScore = getLetterScore(character);
                const maxUses = getMatrixCharacterMaxUses(character);
                const usedCount = usageCounts.get(character.id) ?? 0;
                const disabled = !canPlaceCharacter(character);
                const selected = resolvedActiveSlot
                  ? cleanedTeams
                      .find((team) => team.id === resolvedActiveSlot.teamId)
                      ?.slots[resolvedActiveSlot.slotIndex] === character.id
                  : false;

                return (
                  <button
                    className={`grid min-h-[78px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2.5 py-2 text-left transition ${
                      selected
                        ? "border-app-accent bg-app-accent-soft"
                        : disabled
                          ? "border-app-border/60 bg-app-subtle opacity-50"
                          : "border-app-border bg-app-raised hover:border-app-accent hover:bg-app-subtle"
                    }`}
                    disabled={disabled}
                    key={character.id}
                    onClick={() => placeCharacter(character)}
                    type="button"
                  >
                    <CharacterAvatar character={character} compact />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-app-fg">
                        {character.characterName}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded bg-app-bg/60 px-1.5 py-0.5 text-[10px] font-semibold text-app-muted">
                          {usedCount}/{maxUses}
                        </span>
                        {character.roles[0] ? (
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${rolePillClasses(
                              character.roles[0],
                            )}`}
                          >
                            {character.roles[0]}
                          </span>
                        ) : null}
                        {maxUses > 1 ? (
                          <span className="rounded bg-status-good-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-good-text">
                            2 vigor
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {letterScore ? (
                      <span
                        className={`rounded px-2 py-1 text-sm font-bold leading-none ${ratingGradeClasses(
                          letterScore,
                        )}`}
                      >
                        {letterScore}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-3 border-t border-app-border/80 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-app-fg">Teams</h2>
            </div>
          </div>

          {cleanedTeams.map((team, teamIndex) => {
            const activeInTeam = resolvedActiveSlot?.teamId === team.id;
            const isDragging = draggedTeamId === team.id;
            const isDragTarget = dragOverTeamId === team.id && draggedTeamId !== team.id;
            const elementDiversity = getTeamElementDiversity(team, characterById);

            return (
              <div
                className={`grid gap-3 rounded-md border bg-app-surface p-3 shadow-sm transition ${
                  activeInTeam ? "border-app-accent" : "border-app-border/80"
                } ${isDragTarget ? "ring-2 ring-app-accent/45" : ""} ${
                  isDragging ? "opacity-60" : ""
                }`}
                draggable
                onDragEnd={handleTeamDragEnd}
                onDragOver={(event) => handleTeamDragOver(event, team.id)}
                onDragStart={(event) => handleTeamDragStart(event, team.id)}
                onDrop={(event) => handleTeamDrop(event, team.id)}
                key={team.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="grid h-7 w-6 translate-y-px cursor-grab content-center gap-1 text-app-muted active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      {Array.from({ length: 3 }).map((_, index) => (
                        <span
                          className="block h-0.5 w-5 rounded-full bg-current"
                          key={index}
                        />
                      ))}
                    </span>
                    <button
                      className="min-w-0 text-left text-base font-semibold text-app-fg"
                      onClick={() =>
                        setActiveSlot({
                          teamId: team.id,
                          slotIndex: Math.max(0, team.slots.findIndex((slot) => !slot)),
                        })
                      }
                      type="button"
                    >
                      <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1">
                        <span>Team {teamIndex + 1}</span>
                        {elementDiversity.length > 0 ? (
                          <span className="text-sm font-medium text-app-muted-subtle">
                            ({elementDiversity.join(" / ")})
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </div>
                  <TextButton compact onClick={() => removeTeam(team.id)} variant="danger">
                    Remove
                  </TextButton>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  {team.slots.map((characterId, slotIndex) => {
                    const character = characterId ? characterById.get(characterId) : null;
                    const letterScore = character ? getLetterScore(character) : null;
                    const isActive =
                      resolvedActiveSlot?.teamId === team.id &&
                      resolvedActiveSlot.slotIndex === slotIndex;

                    return (
                      <button
                        className={`grid min-h-[96px] gap-2 rounded-md border p-3 text-left transition ${
                          isActive
                            ? "border-app-accent bg-app-accent-soft"
                            : "border-app-border bg-app-raised hover:border-app-accent"
                        }`}
                        key={`${team.id}-${slotIndex}`}
                        onClick={() =>
                          character
                            ? clearSlot(team.id, slotIndex)
                            : setActiveSlot({ teamId: team.id, slotIndex })
                        }
                        type="button"
                      >
                        {character ? (
                          <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                            <CharacterAvatar character={character} compact />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-app-fg">
                                {character.characterName}
                              </span>
                              <span className="mt-1 block text-xs font-medium text-app-muted-subtle">
                                {character.elementName} / {character.weaponTypeName}
                              </span>
                            </span>
                            <span className="grid gap-1 justify-items-end">
                              {letterScore ? (
                                <span
                                  className={`rounded px-2 py-1 text-sm font-bold leading-none ${ratingGradeClasses(
                                    letterScore,
                                  )}`}
                                >
                                  {letterScore}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        ) : (
                          <span className="grid h-full place-items-center rounded border border-dashed border-app-border text-sm font-semibold text-app-muted-subtle">
                            Slot {slotIndex + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}
