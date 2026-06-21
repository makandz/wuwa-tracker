"use client";

import { useEffect, useState } from "react";

import { CHARACTER_API, WEAPON_API } from "./constants";
import type { ApiCharacter, ApiWeapon, Catalog } from "./types";

const CHARACTER_RELEASE_ORDER = [
  1109, // Lucilla
  1308, // Rebecca
  1511, // Lucy
  1211, // Denia
  1108, // Hiyuki
  1412, // Sigrika
  1510, // Luuk Herssen
  1210, // Aemeath
  1209, // Mornye
  1509, // Lynae
  1307, // Buling
  1508, // Chisa
  1411, // Qiuyuan
  1208, // Galbrena
  1410, // Iuno
  1306, // Augusta
  1608, // Phrolova
  1207, // Lupa
  1409, // Cartethyia
  1407, // Ciaccona
  1507, // Zani
  1408, // Rover: Aero
  1406, // Rover: Aero
  1607, // Cantarella
  1506, // Phoebe
  1206, // Brant
  1504, // Lumi
  1606, // Roccia
  1107, // Carlotta
  1603, // Camellya
  1106, // Youhu
  1505, // Shorekeeper
  1305, // Xiangli Yao
  1105, // Zhezhi
  1205, // Changli
  1304, // Jinhsi
  1404, // Jiyan
  1605, // Rover: Havoc
  1604, // Rover: Havoc
  1405, // Jianxin
  1104, // Lingyang
  1301, // Calcharo
  1303, // Yuanwu
  1601, // Taoqi
  1102, // Sanhua
  1204, // Mortefi
  1602, // Danjin
  1202, // Chixia
  1103, // Baizhi
  1302, // Yinlin
  1502, // Rover: Spectro
  1501, // Rover: Spectro
  1503, // Verina
  1203, // Encore
  1402, // Yangyang
  1403, // Aalto
] as const;

const characterReleaseRank = new Map(
  CHARACTER_RELEASE_ORDER.map((characterId, index) => [characterId, index]),
);

function sortCharactersByReleaseOrder(characters: ApiCharacter[]) {
  return [...characters].sort((a, b) => {
    const aRank = characterReleaseRank.get(a.Id);
    const bRank = characterReleaseRank.get(b.Id);

    if (aRank === undefined && bRank === undefined) {
      return b.Id - a.Id;
    }

    if (aRank === undefined) {
      return -1;
    }

    if (bRank === undefined) {
      return 1;
    }

    return aRank - bRank;
  });
}

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
          characters: sortCharactersByReleaseOrder(characterJson.roleList ?? []),
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
