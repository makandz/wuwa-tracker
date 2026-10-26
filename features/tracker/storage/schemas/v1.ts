import { z } from "zod";

const identifierSchema = z.string().min(1);
const catalogIdSchema = z.number().int().nonnegative();
const timestampSchema = z.iso.datetime();
const finiteNumberSchema = z.number().finite();
const roleSchema = z.enum(["DPS", "Hybrid", "Support"]);
const substatIdSchema = z.enum([
  "crit-rate",
  "crit-dmg",
  "atk",
  "hp",
  "def",
  "atk-percent",
  "hp-percent",
  "def-percent",
  "energy-regen",
  "basic",
  "heavy",
  "skill",
  "liberation",
]);
const substatSlotsSchema = z.array(substatIdSchema.nullable()).length(5).refine(
  (slots) => {
    const selected = slots.filter((slot) => slot !== null);

    return new Set(selected).size === selected.length;
  },
  "Selected substats must be unique.",
);
const echoSchema = z.strictObject({
  critRate: finiteNumberSchema.nullable(),
  critDmg: finiteNumberSchema.nullable(),
  substatIds: substatSlotsSchema,
  prioritySubstatIds: substatSlotsSchema,
});
const checklistSchema = z.strictObject({
  skills: z.boolean(),
  fourCost: z.boolean(),
  threeCostA: z.boolean(),
  threeCostB: z.boolean(),
  oneCostA: z.boolean(),
  oneCostB: z.boolean(),
});
const echoCheckerSchema = z.strictObject({
  enabled: z.boolean(),
  plan: z.enum(["DPS", "HybridSupport"]),
  echoes: z.strictObject({
    fourCost: echoSchema,
    threeCostA: echoSchema,
    threeCostB: echoSchema,
    oneCostA: echoSchema,
    oneCostB: echoSchema,
  }),
});
const characterSchema = z.strictObject({
  id: identifierSchema,
  characterId: catalogIdSchema,
  characterName: z.string().min(1),
  roles: z.array(roleSchema).min(1).refine(
    (roles) => new Set(roles).size === roles.length,
    "Roles must be unique.",
  ),
  weaponId: catalogIdSchema.nullable(),
  weaponName: z.string(),
  fourCostMain: z.enum(["CR", "CD", "BOTH"]),
  noCrit: z.boolean(),
  critRate: finiteNumberSchema,
  critDmg: finiteNumberSchema,
  checklist: checklistSchema,
  echoChecker: echoCheckerSchema.optional(),
  expectedEr: finiteNumberSchema,
  actualEr: finiteNumberSchema,
  notes: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
const preferencesSchema = z.strictObject({
  welcomeSeen: z.boolean(),
  dashboardSortKey: z.enum([
    "updated",
    "name",
    "completionDesc",
    "completionAsc",
    "weightDesc",
    "weightAsc",
  ]),
  dashboardViewMode: z.enum(["list", "grid"]),
  backupNoticeAcknowledgedAt: z.number().int().nonnegative(),
});
const weaponInventoryItemSchema = z.strictObject({
  weaponId: catalogIdSchema,
  count: z.number().int().positive(),
});
const matrixTeamSchema = z.strictObject({
  id: identifierSchema,
  slots: z.tuple([
    identifierSchema.nullable(),
    identifierSchema.nullable(),
    identifierSchema.nullable(),
  ]),
});
const dataSchema = z.strictObject({
  characters: z.array(characterSchema),
  weaponInventory: z.array(weaponInventoryItemSchema),
  matrixTeams: z.array(matrixTeamSchema),
  preferences: preferencesSchema,
}).superRefine((data, context) => {
  const characterIds = new Set(data.characters.map((character) => character.id));
  const inventoryIds = new Set(data.weaponInventory.map((item) => item.weaponId));
  const teamIds = new Set(data.matrixTeams.map((team) => team.id));

  if (characterIds.size !== data.characters.length) {
    context.addIssue({
      code: "custom",
      path: ["characters"],
      message: "Character IDs must be unique.",
    });
  }

  if (inventoryIds.size !== data.weaponInventory.length) {
    context.addIssue({
      code: "custom",
      path: ["weaponInventory"],
      message: "Inventory weapon IDs must be unique.",
    });
  }

  if (teamIds.size !== data.matrixTeams.length) {
    context.addIssue({
      code: "custom",
      path: ["matrixTeams"],
      message: "Team IDs must be unique.",
    });
  }

  data.matrixTeams.forEach((team, teamIndex) => {
    team.slots.forEach((id, slotIndex) => {
      if (id !== null && !characterIds.has(id)) {
        context.addIssue({
          code: "custom",
          path: ["matrixTeams", teamIndex, "slots", slotIndex],
          message: "Team slots must reference an existing tracked character.",
        });
      }
    });
  });
});

export const trackerDocumentV1Schema = z.strictObject({
  app: z.literal("wuwa-tracker"),
  format: z.literal("unified"),
  schemaVersion: z.literal(1),
  revision: z.number().int().positive(),
  savedAt: timestampSchema,
  data: dataSchema,
});

export type TrackerDocumentV1 = z.infer<typeof trackerDocumentV1Schema>;
