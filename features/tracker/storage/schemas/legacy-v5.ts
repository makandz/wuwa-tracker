import { z } from "zod";

const finiteNumberSchema = z.number().finite();
const savedAtSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)));
const roleSchema = z.enum(["DPS", "Hybrid", "Support"]);
const fourCostMainSchema = z.enum(["CR", "CD", "BOTH"]);
const dashboardSortKeySchema = z.enum([
  "updated",
  "name",
  "completionDesc",
  "completionAsc",
  "weightDesc",
  "weightAsc",
]);
const dashboardViewModeSchema = z.enum(["list", "grid"]);

const echoCheckerSubstatIdSchema = z.union([
  z.literal("atk"),
  z.literal("hp"),
  z.literal("def"),
  z.literal("atk-percent"),
  z.literal("hp-percent"),
  z.literal("def-percent"),
  z.literal("energy-regen"),
  z.literal("basic"),
  z.literal("heavy"),
  z.literal("skill"),
  z.literal("liberation"),
  z.literal("crit-rate"),
  z.literal("crit-dmg"),
  z.literal("other"),
]);
const echoCheckerSubstatSlotSchema = echoCheckerSubstatIdSchema.nullable();
const echoCheckerSubstatSlotsSchema = z.union([
  z.array(echoCheckerSubstatSlotSchema).length(3),
  z.array(echoCheckerSubstatSlotSchema).length(5),
]);
const legacyEchoSchema = z.object({
  critRate: finiteNumberSchema.nullable(),
  critDmg: finiteNumberSchema.nullable(),
  substatIds: echoCheckerSubstatSlotsSchema.optional(),
  prioritySubstatIds: z.array(echoCheckerSubstatSlotSchema).length(5).optional(),
  hasRelevantStat: z.boolean().optional(),
  hasSecondRelevantStat: z.boolean().optional(),
  hasThirdRelevantStat: z.boolean().optional(),
});
const legacyEchoesSchema = z.object({
  fourCost: legacyEchoSchema,
  threeCostA: legacyEchoSchema,
  threeCostB: legacyEchoSchema,
  oneCostA: legacyEchoSchema,
  oneCostB: legacyEchoSchema,
});

export const trackerDocumentV5Schema = z
  .object({
    schemaVersion: z.literal(5),
    app: z.literal("wuwa-tracker"),
    savedAt: savedAtSchema,
    revision: z.number().int().positive(),
    data: z
      .object({
        characters: z.array(
          z
            .object({
              id: z.string().min(1),
              characterId: z.number().int().nonnegative(),
              characterName: z.string().min(1),
              roles: z.array(roleSchema).min(1),
              weaponId: finiteNumberSchema.nullable(),
              weaponName: z.string(),
              fourCostMain: fourCostMainSchema,
              noCrit: z.boolean().optional(),
              critRate: finiteNumberSchema,
              critDmg: finiteNumberSchema,
              checklist: z.object({
                skills: z.boolean(),
                fourCost: z.boolean(),
                threeCostA: z.boolean(),
                threeCostB: z.boolean(),
                oneCostA: z.boolean(),
                oneCostB: z.boolean(),
              }),
              echoChecker: z
                .object({
                  enabled: z.boolean(),
                  plan: z.union([z.literal("DPS"), z.literal("HybridSupport")]),
                  echoes: legacyEchoesSchema,
                  substatPriority: z.string().optional(),
                  substats: z.array(
                    z.object({
                      id: z.string().min(1),
                      label: z.string().min(1),
                      checked: z.boolean(),
                    }),
                  ),
                })
                .optional(),
              substatPriority: z.string(),
              expectedEr: finiteNumberSchema,
              actualEr: finiteNumberSchema,
              notes: z.string(),
              createdAt: savedAtSchema,
              updatedAt: savedAtSchema,
            })
            .strict(),
        ),
        weaponInventory: z.array(
          z
            .object({
              weaponId: finiteNumberSchema,
              count: z.number().int().positive(),
            })
            .strict(),
        ),
        matrixTeams: z.array(
          z
            .object({
              id: z.string().min(1),
              slots: z.tuple([
                z.string().min(1).nullable(),
                z.string().min(1).nullable(),
                z.string().min(1).nullable(),
              ]),
            })
            .strict(),
        ),
        preferences: z
          .object({
            welcomeSeen: z.boolean(),
            dashboardSortKey: dashboardSortKeySchema,
            dashboardViewMode: dashboardViewModeSchema,
            backupNoticeAcknowledgedAt: z.number().nonnegative(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type ParsedTrackerDocumentV5 = z.infer<typeof trackerDocumentV5Schema>;
