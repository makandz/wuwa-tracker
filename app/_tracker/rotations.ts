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
  intro: "border-[#4aa3d8]/80 bg-[#173247] text-[#bfe7ff]",
  echo: "border-[#a6e34d]/85 bg-[#263b13] text-[#dcff98]",
  basic: "border-[#20d5d2]/85 bg-[#073f46] text-[#91fffc]",
  heavy: "border-[#f09635]/85 bg-[#46270f] text-[#ffd19a]",
  skill: "border-[#45d06f]/85 bg-[#123b24] text-[#b9ffc9]",
  holdSkill: "border-[#8b96ff]/85 bg-[#252656] text-[#dee2ff]",
  ultimate: "border-[#e56a85]/85 bg-[#461d2a] text-[#ffd3dc]",
  outro: "border-[#ad7df0]/85 bg-[#32214e] text-[#eadbff]",
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
