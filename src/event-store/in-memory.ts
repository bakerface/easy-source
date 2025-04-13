import {
  type EventStore,
  EventStoreConcurrencyError,
  EventStoreCookieFormatError,
  type EventStoreIterateOptions,
  type EventStoreIterator,
  type EventStoreQueryOptions,
  type EventStoreRecord,
  type EventStoreSaveOptions,
  type EventStoreScanOptions,
  EventStoreSubjectRequiredError,
} from ".";

export interface InMemoryEventStoreOptions {
  readonly maxEventsPerQuery?: number;
  readonly maxEventsPerScan?: number;
}

export class InMemoryEventStore<Event> implements EventStore<Event> {
  private _options: InMemoryEventStoreOptions;
  private _records: EventStoreRecord<Event>[];

  constructor(options?: InMemoryEventStoreOptions) {
    this._options = options || {};
    this._records = [];
  }

  async query(
    options: EventStoreQueryOptions,
  ): Promise<EventStoreIterator<Event>> {
    return batch(
      options,
      this._getRecordsForSubject(options.subject),
      this._options.maxEventsPerQuery,
    );
  }

  async scan(
    options?: EventStoreScanOptions,
  ): Promise<EventStoreIterator<Event>> {
    return batch(options, this._records, this._options.maxEventsPerScan);
  }

  async save(
    options: EventStoreSaveOptions<Event>,
  ): Promise<EventStoreIterator<Event>> {
    const cookie = parseCookie(options.cookie);
    const records = this._getRecordsForSubject(options.subject);

    if (cookie !== records.length) {
      throw new EventStoreConcurrencyError(options.subject, options.cookie);
    }

    for (const event of options.events) {
      this._records.push({
        subject: options.subject,
        event,
      });
    }

    return batch(options, this._getRecordsForSubject(options.subject));
  }

  private _getRecordsForSubject(subject: string): EventStoreRecord<Event>[] {
    if (!subject) {
      throw new EventStoreSubjectRequiredError();
    }

    return this._records.filter((record) => record.subject === subject);
  }
}

function batch<Event>(
  options: EventStoreIterateOptions = {},
  filtered: readonly EventStoreRecord<Event>[],
  limit = Number.MAX_SAFE_INTEGER,
): EventStoreIterator<Event> {
  const start = parseCookie(options.cookie);
  const end = start + limit;
  const records = filtered.slice(start, end);
  const cookie = createCookie(start + records.length);

  return { cookie, records };
}

function parseCookie(cookie?: string): number {
  if (!cookie) {
    return 0;
  }

  const n = +cookie;

  if (isNaN(n) || !Number.isInteger(n) || n < 0) {
    throw new EventStoreCookieFormatError(cookie);
  }

  return n;
}

function createCookie(n: number) {
  return "" + n;
}
