import { z } from "zod";

export const legacyArrayExportSchema = z.array(z.unknown());

export const legacyObjectExportSchema = z
  .object({
    characters: z.array(z.unknown()).optional(),
    weaponInventory: z.array(z.unknown()).optional(),
    matrixTeams: z.array(z.unknown()).optional(),
    preferences: z.object({}).catchall(z.unknown()).nullish(),
  })
  .catchall(z.unknown());

export const legacySplitStorageSchema = z.object({
  characters: z.array(z.unknown()),
  weaponInventory: z.array(z.unknown()),
  matrixTeams: z.array(z.unknown()),
  preferences: z.object({}).catchall(z.unknown()),
});

export type LegacySplitStorage = z.infer<typeof legacySplitStorageSchema>;
