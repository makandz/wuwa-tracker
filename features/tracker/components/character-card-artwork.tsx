"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { loadCharacterArtwork } from "../character-artwork";

/**
 * Loads decorative character artwork when its dashboard card approaches the viewport.
 * @param props - The catalog character ID.
 * @returns Dimmed artwork anchored to the card's bottom-right corner.
 */
export function CharacterCardArtwork({ characterId }: { characterId: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [artwork, setArtwork] = useState<{ characterId: number; url: string | null } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = artwork?.characterId === characterId ? artwork.url : null;

  useEffect(() => {
    const element = container.current;

    if (!element) {
      return;
    }

    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      observer.disconnect();
      loadCharacterArtwork(characterId).then((url) => {
        if (active) {
          setArtwork({ characterId, url });
        }
      });
    }, { rootMargin: "100px" });
    observer.observe(element);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [characterId]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" ref={container}>
      {source && source !== failedSource ? (
        <>
          <div className="dashboard-character-art-image">
            <Image
              alt=""
              className="object-contain"
              fill
              onError={() => setFailedSource(source)}
              sizes="320px"
              src={source}
              style={{ objectPosition: "right bottom" }}
            />
          </div>
          <div className="dashboard-character-art-fade absolute inset-0" />
        </>
      ) : null}
    </div>
  );
}
