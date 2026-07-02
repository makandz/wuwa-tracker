"use client";

import type { TrackerStorageStatus } from "../storage";

export function StorageStatusNotice({
  storageStatus,
}: {
  storageStatus: TrackerStorageStatus;
}) {
  if (storageStatus.state === "ready" || storageStatus.state === "migrated") {
    return null;
  }

  const isError = storageStatus.state === "error";

  return (
    <section
      className={`rounded-md border px-4 py-3 ${
        isError
          ? "border-status-danger-border/80 bg-status-danger-bg/35 text-status-danger-text"
          : "border-status-warn-border/80 bg-status-warn-bg/35 text-status-warn-text"
      }`}
    >
      <h2 className="text-sm font-semibold">
        {isError ? "Storage issue" : "Storage recovered"}
      </h2>
      <p className="mt-1 text-sm leading-6">{storageStatus.message}</p>
    </section>
  );
}
