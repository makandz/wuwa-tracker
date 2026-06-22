# Character Rotations Reference

Use this file as the implementation reference when adding or changing character rotations.

## Where Rotations Live

Static rotation data is stored in:

- `app/_tracker/rotations.ts`

The UI renderer is stored in:

- `app/_tracker/components/rotations.tsx`

The character detail page renders rotations from:

- `app/_tracker/screens/detail.tsx`

Users cannot edit rotations in the app. Rotations are hardcoded and keyed by normalized character name.

## How To Add A Rotation

Add an entry to `CHARACTER_ROTATIONS` in `app/_tracker/rotations.ts`.

The key should be the character name normalized the same way `normalizeCharacterName` does it. In practice, use lowercase names without extra punctuation or spacing, for example:

```ts
const CHARACTER_ROTATIONS: Record<string, CharacterRotation[]> = {
  sigrika: [
    // rotations here
  ],
};
```

Each character can have one or more rotations:

```ts
{
  title: "Standard Burst Rotation",
  summary: "Short plain-English summary of the sequence.",
  steps: [
    { action: "intro", label: "Intro" },
    { action: "echo", label: "Echo" },
    { action: "basic", label: "Basic", count: "2" },
    { action: "heavy", label: "Heavy", nextLink: { label: "Cancel" } },
    { action: "ultimate", label: "Ultimate" },
  ],
}
```

## Step Fields

`action` controls the color and legend category.

Supported actions:

- `intro`
- `echo`
- `basic`
- `heavy`
- `skill`
- `holdSkill`
- `ultimate`
- `outro`

`label` is the move name shown in the box.

`count` is used for numbered attacks like Basic 2, Basic 3, Basic 4.

`nextLink` describes the connector to the next move. Use this for animation cancels:

```ts
{ action: "heavy", label: "Heavy", nextLink: { label: "Cancel" } }
```

The UI shows this as a red slashed `>` connector, not as visible text. The word `Cancel` appears only in hover/focus tooltip and accessibility text.

`note` is only for rare extra context that cannot be represented by the move or connector. Notes show as hover/focus tooltips. Do not use notes for animation cancels.

## Display Rules

The rotation section appears at the bottom of the character detail page only when that character has static rotation data.

The timeline wraps onto new lines instead of horizontally scrolling.

Move boxes are content-sized with small minimum width and height. Do not use fixed-size cards for every step.

Normal connectors are muted `>` arrows.

Animation-cancel connectors are red `>` arrows with a diagonal slash.

Move boxes should stay compact. Avoid putting long skill names in the main sequence unless the custom name is important for understanding the rotation.

Action colors should stay visually distinct from each other. Current intent: Intro blue, Echo lime, Basic cyan, Heavy orange, Skill green, Hold Skill indigo, Ultimate red, Outro purple. In particular, avoid making Echo look like Heavy or Basic look like Skill.

The card renderer removes duplicate text automatically:

- `{ action: "basic", label: "Basic", count: "2" }` displays as `Basic 2`
- `{ action: "echo", label: "Echo" }` displays as `Echo`
- `{ action: "heavy", label: "Heavy" }` displays as `Heavy`
- `{ action: "ultimate", label: "Ultimate" }` displays as `Ultimate`
- `{ action: "basic", label: "Enhanced" }` displays `Basic` as the small category and `Enhanced` as the main text

## Summarizing Raw Rotations

When the user provides a raw rotation, simplify it before adding it.

Prefer gameplay-readable terms over full move names:

- `Basic: Elucidated` can become `Enhanced`
- `Heavy: Chain Whip` can become `Heavy`
- `Heavy: Outburst` can become `Heavy`
- `Hold Skill: Learn My True Name` can become `Hold Skill`

Represent animation cancels with `nextLink`, not notes:

```ts
{ action: "heavy", label: "Heavy", nextLink: { label: "Cancel" } },
{ action: "ultimate", label: "Ultimate" },
```

Keep `summary` short and readable. It should explain the sequence without repeating every box verbatim.

Example:

```ts
summary:
  "Intro, Echo, Basic 2-4 into Enhanced, Heavy into Ultimate, repeat the Basic chain, then Heavy into Hold Skill before Outro.",
```

## Current Example

Sigrika is the reference implementation in `app/_tracker/rotations.ts`.
