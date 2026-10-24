---
name: update-characters
description: Check for new Wuthering Waves characters and update the tracker's release order and Prydwen priorities.
---

# Update characters

Start with `features/tracker/constants.ts`,
`features/tracker/character-release-order.ts`, and `features/tracker/data/`.

- Compare the full live Encore catalog with the local release order, checking
  beyond the newest known character even when the request names only one.
- Verify chronology against official announcements and
  [banner history](https://bannerhistory.app/en/wuwa-pickup-history). IDs do not
  encode release order. Distinguish new releases, reruns, and upcoming entries;
  include upcoming characters only according to the existing catalog policy.
- Use live [Prydwen character pages](https://www.prydwen.gg/wuthering-waves/characters)
  for **Skill Priority** and **Substats**, including characters with missing data.
  Preserve ties, thresholds, role-specific orders, and meaningful skip notes.
  Leave unpublished priorities unavailable; report gaps without guessing.
- Apply verified data using existing schemas and sorting conventions, including
  adjacent Rover variants. Report skill orders if the app has no storage for them.
- Update source links, check dates, stale notes, and affected tests. Verify
  priority parsing and summarize additions or confirm that no newer releases exist.
