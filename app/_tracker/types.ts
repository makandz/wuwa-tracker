export type Role = "DPS" | "Hybrid" | "Support";
export type FourCostMain = "CR" | "CD" | "BOTH";
export type WeaponRarityTone = "blue" | "purple" | "standardGold" | "limitedGold" | "neutral";
export type RatingGrade = "S+" | "S" | "A" | "B" | "C" | "D" | "F";
export type DashboardSortKey =
  | "updated"
  | "name"
  | "completionDesc"
  | "completionAsc"
  | "weightDesc"
  | "weightAsc";
export type RoleFilter = "all" | Role;
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

export type Checklist = {
  skills: boolean;
  fourCost: boolean;
  threeCostA: boolean;
  threeCostB: boolean;
  oneCostA: boolean;
  oneCostB: boolean;
};

export type TrackedCharacter = {
  id: string;
  characterId: number;
  characterName: string;
  characterIcon: string;
  qualityId: number;
  elementName: string;
  weaponTypeId: number;
  weaponTypeName: string;
  roles: Role[];
  weaponId: number | null;
  weaponName: string;
  weaponQualityId: number | null;
  fourCostMain: FourCostMain;
  noCrit?: boolean;
  critRate: number;
  critDmg: number;
  checklist: Checklist;
  expectedEr: number;
  actualEr: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type WeaponInventoryItem = {
  weaponId: number;
  count: number;
};

export type MatrixTeam = {
  id: string;
  slots: [string | null, string | null, string | null];
};
