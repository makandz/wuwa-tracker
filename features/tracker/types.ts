import type { TrackerDocumentV1 } from "./storage/schemas/v1";

type TrackerData = TrackerDocumentV1["data"];

export type Role = TrackedCharacter["roles"][number];
export type FourCostMain = TrackedCharacter["fourCostMain"];
export type EchoCheckerPlan = EchoChecker["plan"];
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
export type DashboardSortKey = TrackerData["preferences"]["dashboardSortKey"];
export type DashboardViewMode = TrackerData["preferences"]["dashboardViewMode"];
export type WeaponFilter = "all" | "selected" | "missing" | "attention";
export type RatingValue = number | null;

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
export type Checklist = TrackedCharacter["checklist"];
export type EchoChecklistKey = Exclude<keyof Checklist, "skills">;
export type EchoChecker = NonNullable<TrackedCharacter["echoChecker"]>;
export type EchoCheckerEcho = EchoChecker["echoes"][EchoChecklistKey];
export type EchoCheckerSubstatSlots = EchoCheckerEcho["substatIds"];
export type EchoCheckerSubstatId = NonNullable<EchoCheckerSubstatSlots[number]>;
export type WeaponInventoryItem = TrackerData["weaponInventory"][number];
export type MatrixTeam = TrackerData["matrixTeams"][number];

export type EchoSubstatId = EchoCheckerSubstatId;
