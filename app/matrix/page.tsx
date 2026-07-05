"use client";

import { useRouter } from "next/navigation";

import { MatrixScreen } from "../_tracker/screens/matrix";
import { useTrackerData } from "../_tracker/tracker-provider";

export default function MatrixPage() {
  const { catalog, characters, matrixTeams, updateMatrixTeams } = useTrackerData();
  const router = useRouter();

  return (
    <div className="min-h-full bg-app-bg text-app-fg">
      <MatrixScreen
        catalog={catalog}
        characters={characters}
        onBack={() => router.push("/")}
        onUpdateTeams={updateMatrixTeams}
        teams={matrixTeams}
      />
    </div>
  );
}
