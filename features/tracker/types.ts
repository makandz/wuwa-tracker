import type { TrackerDocumentV1 } from "./storage/schemas/v1";

type TrackerData = TrackerDocumentV1["data"];

export type WeaponRarityTone = "blue" | "purple" | "standardGold" | "limitedGold" | "neutral";
export type CharacterBadgeTone = "blue";
export type RatingGrade =
  | "S+"
  | "S"
  | "S-"
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C"
  | "D"
  | "F";
export type RatingValue = number | null;
export type ErStatus = "unknown" | "below" | "met";

export type ApiCharacter = {
  Id: number;
  Name: string;
  QualityId: number;
  Element?: {
    Name?: string;
  };
  RoleHeadIcon?: string;
  WeaponType?: {
    Id?: number;
    Name?: string;
  };
};

export type ApiWeapon = {
  Id: number;
  Name: string;
  Icon?: string;
  Type: number;
  QualityId: number;
  TypeName: string;
};

export type Catalog = {
  characters: ApiCharacter[];
  weapons: ApiWeapon[];
  loading: boolean;
  error: string;
};

export type TrackedCharacter = TrackerData["characters"][number];
export type EchoSet = TrackedCharacter["echoSets"][number];
export type EchoScoringPreset = EchoSet["scoring"];
export type Checklist = EchoSet["checklist"];
export type EchoChecklistKey = keyof Checklist;
export type EchoCheckerEcho = EchoSet["echoes"][EchoChecklistKey];
export type EchoCheckerSubstatSlots = EchoCheckerEcho["substatIds"];
export type EchoCheckerSubstatId = NonNullable<EchoCheckerSubstatSlots[number]>;
export type WeaponInventoryItem = TrackerData["weaponInventory"][number];
export type MatrixTeam = TrackerData["matrixTeams"][number];

export type EchoSubstatId = EchoCheckerSubstatId;
