export interface EventStore<Event> {
  query(options: EventStoreQueryOptions): Promise<EventStoreIterator<Event>>;
  scan(options: EventStoreScanOptions): Promise<EventStoreIterator<Event>>;
  save(
    options: EventStoreSaveOptions<Event>,
  ): Promise<EventStoreIterator<Event>>;
}

export type EventStoreScanOptions = EventStoreIterateOptions;

export interface EventStoreQueryOptions extends EventStoreIterateOptions {
  readonly subject: string;
}

export interface EventStoreSaveOptions<Event> extends EventStoreIterateOptions {
  readonly subject: string;
  readonly events: readonly Event[];
}

export interface EventStoreIterateOptions {
  readonly cookie?: string;
  readonly signal?: AbortSignal;
}

export interface EventStoreIterator<Event> {
  readonly cookie: string;
  readonly records: readonly EventStoreRecord<Event>[];
}

export interface EventStoreRecord<Event> {
  readonly subject: string;
  readonly event: Event;
}

export class EventStoreSubjectRequiredError extends Error {
  public readonly status: number;

  constructor() {
    super("A subject is required.");
    this.name = "EventStoreSubjectRequiredError";
    this.status = 400;
  }
}

export class EventStoreCookieFormatError extends Error {
  public readonly status: number;
  public readonly cookie: string;

  constructor(cookie: string) {
    super("This cookie is not valid.");
    this.name = "EventStoreCookieFormatError";
    this.status = 400;
    this.cookie = cookie;
  }
}

export class EventStoreConcurrencyError extends Error {
  public readonly status: number;
  public readonly subject: string;
  public readonly cookie: string | undefined;

  constructor(subject: string, cookie?: string) {
    super("This subject is out-of-date.");
    this.name = "EventStoreConcurrencyError";
    this.status = 409;
    this.subject = subject;
    this.cookie = cookie;
  }
}
