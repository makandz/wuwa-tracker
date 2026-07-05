"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { getAssignmentCounts } from "../_tracker/domain";
import { WeaponInventoryScreen } from "../_tracker/screens/inventory";
import { useTrackerData } from "../_tracker/tracker-provider";

export default function InventoryPage() {
  const { catalog, characters, weaponInventory, setWeaponCount } = useTrackerData();
  const router = useRouter();
  const assignmentCounts = useMemo(() => getAssignmentCounts(characters), [characters]);

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <WeaponInventoryScreen
        assignmentCounts={assignmentCounts}
        catalog={catalog}
        inventory={weaponInventory}
        onBack={() => router.push("/")}
        onSetWeaponCount={setWeaponCount}
      />
    </div>
  );
}
