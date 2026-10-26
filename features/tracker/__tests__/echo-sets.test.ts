import { describe, expect, test } from "vitest";
import { addEchoSet, createEchoSet, deleteEchoSet, updateEchoSet } from "../echo-sets";
import { makeTrackedCharacter } from "./fixtures";

describe("echo set management", () => {
  test("adds independent empty sets, caps them at three, and rejects duplicate IDs", () => {
    const original = makeTrackedCharacter();
    const two = addEchoSet(original, "second");
    const three = addEchoSet(two, "third");

    expect(original.echoSets).toHaveLength(1);
    expect(three.echoSets).toHaveLength(3);
    expect(() => addEchoSet(three, "fourth")).toThrow("at most three");
    expect(() => addEchoSet(original, original.echoSets[0].id)).toThrow("unique");
    two.echoSets[1].echoes.fourCost.substatIds[0] = "atk";
    expect(original.echoSets[0].echoes.fourCost.substatIds[0]).toBe("atk-percent");
  });

  test("duplicates all measurements without sharing nested data", () => {
    const original = makeTrackedCharacter();
    const copied = addEchoSet(original, "copy", original.echoSets[0].id);
    const duplicate = copied.echoSets[1];

    expect(duplicate).toEqual({ ...original.echoSets[0], id: "copy", name: "Default copy" });
    duplicate.echoes.fourCost.critRate = 6.3;
    duplicate.checklist.fourCost = true;
    expect(original.echoSets[0].echoes.fourCost.critRate).toBe(10.5);
    expect(original.echoSets[0].checklist.fourCost).toBe(false);
    expect(() => addEchoSet(original, "invalid", "missing")).toThrow("not found");
  });

  test("renames and switches mode or scoring without erasing either set of inputs", () => {
    const original = makeTrackedCharacter();
    const set = original.echoSets[0];
    const edited = updateEchoSet(original, { ...set, name: "Alternate", mode: "checklist", scoring: "priority-stats" });

    expect(edited.echoSets[0].echoes).toEqual(set.echoes);
    expect(edited.echoSets[0].checklist).toEqual(set.checklist);
    expect(edited.echoSets[0].actualEr).toBe(118);
    expect(edited.expectedEr).toBe(original.expectedEr);
    expect(original.echoSets[0].name).toBe("Default");
    expect(() => updateEchoSet(original, createEchoSet("missing"))).toThrow("not found");
  });

  test("removes only the requested set and protects the final set", () => {
    const original = makeTrackedCharacter();
    const two = addEchoSet(original, "second");
    expect(deleteEchoSet(two, "second")).toEqual(original);
    expect(() => deleteEchoSet(original, original.echoSets[0].id)).toThrow("at least one");
    expect(() => deleteEchoSet(two, "missing")).toThrow("not found");
  });
});
