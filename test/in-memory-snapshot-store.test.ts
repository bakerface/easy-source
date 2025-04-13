import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { InMemorySnapshotStore } from "../src";

describe("InMemorySnapshotStore", () => {
  let snapshotStore: InMemorySnapshotStore<string>;

  beforeEach(async () => {
    snapshotStore = new InMemorySnapshotStore<string>();

    await snapshotStore.save({
      subject: "A",
      cookie: "cookie-a",
      snapshot: "snapshot-a",
    });
  });

  describe(".query", () => {
    it("returns undefined for subjects that do not exist", async () => {
      const response = await snapshotStore.query({ subject: "nope" });
      assert.deepStrictEqual(response, undefined);
    });

    it("returns the snapshot for subjects that do exist", async () => {
      const response = await snapshotStore.query({ subject: "A" });

      assert.deepStrictEqual(response, {
        subject: "A",
        cookie: "cookie-a",
        snapshot: "snapshot-a",
      });
    });
  });

  describe(".save", () => {
    it("creates a new snapshot for subjects that do not exist", async () => {
      await snapshotStore.save({
        subject: "B",
        cookie: "cookie-b",
        snapshot: "snapshot-b",
      });

      const response = await snapshotStore.query({ subject: "B" });

      assert.deepStrictEqual(response, {
        subject: "B",
        cookie: "cookie-b",
        snapshot: "snapshot-b",
      });
    });

    it("updates the snapshot for subjects that do exist", async () => {
      await snapshotStore.save({
        subject: "A",
        cookie: "cookie-new",
        snapshot: "snapshot-new",
      });

      const response = await snapshotStore.query({ subject: "A" });

      assert.deepStrictEqual(response, {
        subject: "A",
        cookie: "cookie-new",
        snapshot: "snapshot-new",
      });
    });
  });
});
