import { z } from "zod";

import {
  DASHBOARD_SORT_KEYS,
  DASHBOARD_VIEW_MODES,
  ECHO_CHECKLIST_ITEMS,
  FOUR_COST_OPTIONS,
  ROLES,
} from "../../constants";
import type {
  DashboardSortKey,
  DashboardViewMode,
  EchoChecklistKey,
  FourCostMain,
  Role,
} from "../../types";
import { TRACKER_APP_ID, TRACKER_SCHEMA_VERSION } from "../keys";

const finiteNumberSchema = z.number().finite();
const savedAtSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)));
const roleSchema = z.custom<Role>((value) => ROLES.includes(value as Role));
const fourCostMainSchema = z.custom<FourCostMain>((value) =>
  FOUR_COST_OPTIONS.some((option) => option.value === value),
);
const dashboardSortKeySchema = z.custom<DashboardSortKey>((value) =>
  DASHBOARD_SORT_KEYS.includes(value as DashboardSortKey),
);
const dashboardViewModeSchema = z.custom<DashboardViewMode>((value) =>
  DASHBOARD_VIEW_MODES.includes(value as DashboardViewMode),
);
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
const echoChecklistKeySchemas = ECHO_CHECKLIST_ITEMS.reduce(
  (schemas, item) => ({
    ...schemas,
    [item.key]: z.object({
      critRate: finiteNumberSchema.nullable(),
      critDmg: finiteNumberSchema.nullable(),
      substatIds: z.array(echoCheckerSubstatSlotSchema).length(3).optional(),
      prioritySubstatIds: z.array(echoCheckerSubstatSlotSchema).length(5).optional(),
      hasRelevantStat: z.boolean().optional(),
      hasSecondRelevantStat: z.boolean().optional(),
      hasThirdRelevantStat: z.boolean().optional(),
    }),
  }),
  {} as Record<EchoChecklistKey, z.ZodType>,
);

export const trackerDocumentV5Schema = z
  .object({
    schemaVersion: z.literal(TRACKER_SCHEMA_VERSION),
    app: z.literal(TRACKER_APP_ID),
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
                  echoes: z.object(echoChecklistKeySchemas),
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
