export type StorageVersion = "legacy-v3" | number;

export type MigrationSource = {
  id: string;
  version: StorageVersion;
  payloadVersion: StorageVersion;
  label: string;
  payload: unknown;
  backup: {
    keys: Array<{
      key: string;
      value: string | null;
    }>;
  };
  preview: {
    counts: Array<{
      label: string;
      value: number;
    }>;
    items: string[];
  };
};

export type RegisteredMigrationStep = {
  id: string;
  fromVersion: StorageVersion;
  toVersion: StorageVersion;
  title: string;
  description: string;
  apply: (input: unknown) => unknown;
};

export type MigrationStep = {
  id: string;
  fromVersion: StorageVersion;
  toVersion: StorageVersion;
  title: string;
  description: string;
};
