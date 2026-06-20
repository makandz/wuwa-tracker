"use client";

import { useEffect, useState } from "react";

import { CHARACTER_API, WEAPON_API } from "./constants";
import type { ApiCharacter, ApiWeapon, Catalog } from "./types";

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>({
    characters: [],
    weapons: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const [characterResponse, weaponResponse] = await Promise.all([
          fetch(CHARACTER_API),
          fetch(WEAPON_API),
        ]);

        if (!characterResponse.ok || !weaponResponse.ok) {
          throw new Error("Catalog request failed.");
        }

        const characterJson = (await characterResponse.json()) as { roleList?: ApiCharacter[] };
        const weaponJson = (await weaponResponse.json()) as { weapons?: ApiWeapon[] };

        if (!active) {
          return;
        }

        setCatalog({
          characters: [...(characterJson.roleList ?? [])].sort((a, b) =>
            a.Name.localeCompare(b.Name),
          ),
          weapons: [...(weaponJson.weapons ?? [])].sort((a, b) =>
            a.Name.localeCompare(b.Name),
          ),
          loading: false,
          error: "",
        });
      } catch {
        if (!active) {
          return;
        }

        setCatalog({
          characters: [],
          weapons: [],
          loading: false,
          error: "Could not load the live character and weapon catalog.",
        });
      }
    }

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  return catalog;
}
