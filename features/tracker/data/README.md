# Curated character data

## Release order

`../character-release-order.ts` maintains the picker's newest-first order because
Encore IDs do not encode release order. The current roster was checked on
2026-10-20 against [banner history](https://bannerhistory.app/en/wuwa-pickup-history),
[version announcements](https://wutheringwaves.gg/author/wutheringwavesgg/page/2/),
and the [3.5 character overview](https://allthings.how/wuthering-waves-3-5-electro-rover-mengzhou-region-and-every-leaked-character/).

The latest block is Suoming (3.7 Phase II), Hsin (3.7 Phase I), Jingran (3.6
Phase II), Qingxiao (3.6 Phase I), Suisui (3.5 Phase II), then Yangyang: Xuanling
and both Electro Rovers (3.5 Phase I), followed by Lucilla. Rover variants stay adjacent,
with the higher ID first. Unknown IDs appear first in descending ID order.

Rechecked on 2026-10-23: all 64 entries in the [live Encore catalog](https://api-v2.encore.moe/api/en/character)
are covered. Suoming released on 2026-10-22 and remains the newest release in
[banner history](https://bannerhistory.app/en/wuwa-pickup-history). Prydwen lists
[Lily](https://www.prydwen.gg/wuthering-waves/characters/lily) for 3.8; she is
upcoming and absent from Encore, so no release-order entries were added.

## Substat priorities

`substat-priorities.json` maps Encore character IDs to curated priority strings.
The following additions were checked against Prydwen's **Substats** sections on
2026-10-20. Preserve source wording and thresholds when updating them.

| Encore ID | Character | Source |
| --- | --- | --- |
| 1413 | Qingxiao | [Prydwen build](https://www.prydwen.gg/wuthering-waves/characters/qingxiao) |
| 1311 | Hsin | [Prydwen build](https://www.prydwen.gg/wuthering-waves/characters/hsin) |
| 1212 | Jingran | [Prydwen build](https://www.prydwen.gg/wuthering-waves/characters/jingran) |

Suoming (1312) was added on 2026-10-23 after checking the **Substats** section of
[Prydwen's Suoming build](https://www.prydwen.gg/wuthering-waves/characters/suoming),
updated 2026-10-22. Characters without verified priorities return `null`.
