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

const legacyEchoSchema = z.object({
  critRate: finiteNumberSchema.nullable(),
  critDmg: finiteNumberSchema.nullable(),
  hasRelevantStat: z.boolean(),
  hasSecondRelevantStat: z.boolean(),
  hasThirdRelevantStat: z.boolean().catch(false),
});
const legacyEchoesSchema = z.object({
  fourCost: legacyEchoSchema,
  threeCostA: legacyEchoSchema,
  threeCostB: legacyEchoSchema,
  oneCostA: legacyEchoSchema,
  oneCostB: legacyEchoSchema,
});

export const trackerDocumentV4Schema = z
  .object({
    schemaVersion: z.literal(4),
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
              characterIcon: z.string(),
              qualityId: z.number().int().nonnegative(),
              elementName: z.string(),
              weaponTypeId: z.number().int().nonnegative(),
              weaponTypeName: z.string(),
              weaponQualityId: z.number().int().nonnegative().nullable().optional(),
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

export type TrackerDocumentV4 = z.infer<typeof trackerDocumentV4Schema>;
export type TrackerCharacterV4 = TrackerDocumentV4["data"]["characters"][number];
