import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
  EventStoreConcurrencyError,
  EventStoreCookieFormatError,
  EventStoreSubjectRequiredError,
  InMemoryEventStore,
} from "../src";

describe("InMemoryEventStore", () => {
  let eventStore: InMemoryEventStore<number>;

  beforeEach(async () => {
    eventStore = new InMemoryEventStore<number>({
      maxEventsPerQuery: 7,
      maxEventsPerScan: 10,
    });

    const a = await eventStore.save({
      subject: "A",
      events: [0, 1, 2, 3, 4],
    });

    await eventStore.save({
      subject: "B",
      events: [0, 1, 2, 3, 4],
    });

    await eventStore.save({
      subject: "A",
      cookie: a.cookie,
      events: [5, 6, 7, 8, 9],
    });
  });

  describe(".query", () => {
    it("throws if the subject is not provided", async () => {
      const response = eventStore.query({ subject: "" });
      await assert.rejects(response, new EventStoreSubjectRequiredError());
    });

    it("returns no events for subjects that do not exist", async () => {
      const response = await eventStore.query({ subject: "nope" });

      assert.deepStrictEqual(response, {
        cookie: "0",
        records: [],
      });
    });

    it("returns up to the maximum number of events", async () => {
      const response = await eventStore.query({ subject: "A" });

      assert.deepStrictEqual(response, {
        cookie: "7",
        records: [
          { subject: "A", event: 0 },
          { subject: "A", event: 1 },
          { subject: "A", event: 2 },
          { subject: "A", event: 3 },
          { subject: "A", event: 4 },
          { subject: "A", event: 5 },
          { subject: "A", event: 6 },
        ],
      });
    });

    it("returns new events using the provided cookie", async () => {
      const response = await eventStore.query({ subject: "A", cookie: "7" });

      assert.deepStrictEqual(response, {
        cookie: "10",
        records: [
          { subject: "A", event: 7 },
          { subject: "A", event: 8 },
          { subject: "A", event: 9 },
        ],
      });
    });

    it("throws if the cookie is not valid", async () => {
      const response = eventStore.query({
        subject: "A",
        cookie: "bad",
      });

      await assert.rejects(response, new EventStoreCookieFormatError("bad"));
    });
  });

  describe(".scan", () => {
    it("returns up to the maximum number of events", async () => {
      const response = await eventStore.scan();

      assert.deepStrictEqual(response, {
        cookie: "10",
        records: [
          { subject: "A", event: 0 },
          { subject: "A", event: 1 },
          { subject: "A", event: 2 },
          { subject: "A", event: 3 },
          { subject: "A", event: 4 },
          { subject: "B", event: 0 },
          { subject: "B", event: 1 },
          { subject: "B", event: 2 },
          { subject: "B", event: 3 },
          { subject: "B", event: 4 },
        ],
      });
    });

    it("returns new events using the provided cookie", async () => {
      const response = await eventStore.scan({ cookie: "10" });

      assert.deepStrictEqual(response, {
        cookie: "15",
        records: [
          { subject: "A", event: 5 },
          { subject: "A", event: 6 },
          { subject: "A", event: 7 },
          { subject: "A", event: 8 },
          { subject: "A", event: 9 },
        ],
      });
    });

    it("throws if the cookie is not valid", async () => {
      const response = eventStore.scan({ cookie: "bad" });
      await assert.rejects(response, new EventStoreCookieFormatError("bad"));
    });
  });

  describe(".save", () => {
    it("throws if the subject is not provided", async () => {
      const response = eventStore.save({ subject: "", events: [] });
      await assert.rejects(response, new EventStoreSubjectRequiredError());
    });

    it("throws if the cookie is out-of-date", async () => {
      const response = eventStore.save({
        subject: "A",
        cookie: "1000",
        events: [999],
      });

      await assert.rejects(
        response,
        new EventStoreConcurrencyError("A", "1000"),
      );
    });

    it("returns the saved records", async () => {
      const response = await eventStore.save({
        subject: "A",
        cookie: "10",
        events: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      });

      assert.deepStrictEqual(response, {
        cookie: "20",
        records: [
          { subject: "A", event: 10 },
          { subject: "A", event: 11 },
          { subject: "A", event: 12 },
          { subject: "A", event: 13 },
          { subject: "A", event: 14 },
          { subject: "A", event: 15 },
          { subject: "A", event: 16 },
          { subject: "A", event: 17 },
          { subject: "A", event: 18 },
          { subject: "A", event: 19 },
        ],
      });
    });
  });
});
