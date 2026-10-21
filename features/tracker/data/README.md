# Curated character data

## Release order

`../character-release-order.ts` maintains the picker's newest-first order because
Encore IDs do not encode release order. The current roster was checked on
2026-10-20 against [banner history](https://bannerhistory.app/en/wuwa-pickup-history),
[version announcements](https://wutheringwaves.gg/author/wutheringwavesgg/page/2/),
and the [3.5 character overview](https://allthings.how/wuthering-waves-3-5-electro-rover-mengzhou-region-and-every-leaked-character/).

The latest block is Suoming (3.7 Phase II), Hsin (3.7 Phase I), Jingran (3.6
Phase II), Qingxiao (3.6 Phase I), Suisui (3.5 Phase II), then Yangyang: Xuanling
and both Electro Rovers (3.5 Phase I), followed by Lucilla. Suoming is upcoming
but already appears in the live Encore catalog. Rover variants stay adjacent,
with the higher ID first. Unknown IDs appear first in descending ID order.

## Substat priorities

`substat-priorities.json` maps Encore character IDs to curated priority strings.
The following additions were checked against Prydwen's **Substats** sections on
2026-10-20. Preserve source wording and thresholds when updating them.

| Encore ID | Character | Source |
| --- | --- | --- |
| 1413 | Qingxiao | [Prydwen build](https://www.prydwen.gg/wuthering-waves/characters/qingxiao) |
| 1311 | Hsin | [Prydwen build](https://www.prydwen.gg/wuthering-waves/characters/hsin) |
| 1212 | Jingran | [Prydwen build](https://www.prydwen.gg/wuthering-waves/characters/jingran) |

Suoming (1312) is intentionally absent: [Prydwen's Suoming page](https://www.prydwen.gg/wuthering-waves/characters/suoming)
had no build information on that date. The lookup returns `null` until a
verified priority is available.
