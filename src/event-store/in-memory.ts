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
    return this._batch(
      options,
      this._options.maxEventsPerQuery || Number.MAX_SAFE_INTEGER,
      this._getRecordsForSubject(options.subject),
    );
  }

  async scan(
    options?: EventStoreScanOptions,
  ): Promise<EventStoreIterator<Event>> {
    return this._batch(
      options || {},
      this._options.maxEventsPerScan || Number.MAX_SAFE_INTEGER,
      this._records,
    );
  }

  async save(
    options: EventStoreSaveOptions<Event>,
  ): Promise<EventStoreIterator<Event>> {
    const records = this._getRecordsForSubject(options.subject);
    const cookie = this._parseCookieOrDefault(options.cookie, 0);

    if (records.length !== cookie) {
      throw new EventStoreConcurrencyError(options.subject, options.cookie);
    }

    for (const event of options.events) {
      this._records.push({ subject: options.subject, event });
    }

    return this._batch(
      options,
      Number.MAX_SAFE_INTEGER,
      this._getRecordsForSubject(options.subject),
    );
  }

  private _getRecordsForSubject(subject: string): EventStoreRecord<Event>[] {
    if (!subject) {
      throw new EventStoreSubjectRequiredError();
    }

    return this._records.filter((record) => record.subject === subject);
  }

  private _batch(
    options: EventStoreIterateOptions,
    limit: number,
    filtered: readonly EventStoreRecord<Event>[],
  ): EventStoreIterator<Event> {
    const start = this._parseCookieOrDefault(options.cookie, 0);
    const end = start + limit;
    const records = filtered.slice(start, end);
    const cookie = this._createCookie(start + records.length);

    return { cookie, records };
  }

  private _parseCookieOrDefault<T>(
    cookie: string | undefined,
    otherwise: T,
  ): T | number {
    if (!cookie) {
      return otherwise;
    }

    const n = +cookie;

    if (isNaN(n) || !Number.isInteger(n) || n < 0) {
      throw new EventStoreCookieFormatError(cookie);
    }

    return n;
  }

  private _createCookie(n: number) {
    return "" + n;
  }
}
