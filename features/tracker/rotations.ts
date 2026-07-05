import { normalizeCharacterName } from "./domain";

export type RotationAction =
  | "intro"
  | "echo"
  | "basic"
  | "heavy"
  | "skill"
  | "holdSkill"
  | "ultimate"
  | "outro";

export type RotationStep = {
  action: RotationAction;
  label: string;
  count?: string;
  nextLink?: {
    label: string;
  };
  note?: string;
};

export type CharacterRotation = {
  title: string;
  summary: string;
  steps: RotationStep[];
};

export const ROTATION_ACTION_LABELS: Record<RotationAction, string> = {
  intro: "Intro",
  echo: "Echo",
  basic: "Basic",
  heavy: "Heavy",
  skill: "Skill",
  holdSkill: "Hold Skill",
  ultimate: "Ultimate",
  outro: "Outro",
};

export const ROTATION_ACTION_CLASSES: Record<RotationAction, string> = {
  intro: "border-app-border bg-app-raised text-app-muted",
  echo: "border-status-good-border/70 bg-status-good-bg/60 text-status-good-text",
  basic: "border-app-accent-strong/70 bg-app-accent-soft text-app-fg",
  heavy: "border-status-warn-border/70 bg-status-warn-bg/65 text-status-warn-text",
  skill: "border-role-support-border/70 bg-role-support-bg/60 text-role-support-text",
  holdSkill: "border-role-hybrid-border/70 bg-role-hybrid-bg/60 text-role-hybrid-text",
  ultimate: "border-status-danger-border/70 bg-status-danger-bg/60 text-status-danger-text",
  outro: "border-role-dps-border/70 bg-role-dps-bg/60 text-role-dps-text",
};

const CHARACTER_ROTATIONS: Record<string, CharacterRotation[]> = {
  sigrika: [
    {
      title: "Standard Burst Rotation",
      summary:
        "Intro, Echo, Basic 2-4 into Enhanced, Heavy into Ultimate, repeat the Basic chain, then Heavy into Hold Skill before Outro.",
      steps: [
        { action: "intro", label: "Intro" },
        { action: "echo", label: "Echo" },
        { action: "basic", label: "Basic", count: "2" },
        { action: "basic", label: "Basic", count: "3" },
        { action: "basic", label: "Basic", count: "4" },
        { action: "basic", label: "Enhanced" },
        { action: "heavy", label: "Heavy", nextLink: { label: "Cancel" } },
        { action: "ultimate", label: "Ultimate" },
        { action: "basic", label: "Basic", count: "2" },
        { action: "basic", label: "Basic", count: "3" },
        { action: "basic", label: "Basic", count: "4" },
        { action: "basic", label: "Enhanced" },
        { action: "heavy", label: "Heavy", nextLink: { label: "Cancel" } },
        { action: "holdSkill", label: "Hold Skill" },
        { action: "outro", label: "Outro" },
      ],
    },
  ],
};

export function getCharacterRotations(characterName: string) {
  return CHARACTER_ROTATIONS[normalizeCharacterName(characterName)] ?? [];
}
