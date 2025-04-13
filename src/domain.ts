import type { EventStore, EventStoreIterator } from "./event-store";
import { InMemoryEventStore } from "./event-store/in-memory";
import type { SnapshotStore } from "./snapshot-store";
import { InMemorySnapshotStore } from "./snapshot-store/in-memory";

export class Domain<State, Commands, Events> {
  private _definition: DomainDefinition<State, Commands, Events>;
  private _eventStore: EventStore<DomainUnionType<Events>>;
  private _snapshotStore: SnapshotStore<State>;
  private _eventCreators: DomainUnionFunctions<Events>;

  constructor(definition: DomainDefinition<State, Commands, Events>) {
    this._definition = definition;
    this._eventStore = new InMemoryEventStore();
    this._snapshotStore = new InMemorySnapshotStore();
    this._eventCreators = creatorsOf(definition.events);
  }

  withEventStore(eventStore: EventStore<DomainUnionType<Events>>): this {
    this._eventStore = eventStore;
    return this;
  }

  withSnapshotStore(snapshotStore: SnapshotStore<State>): this {
    this._snapshotStore = snapshotStore;
    return this;
  }

  async fetch(options: DomainFetchOptions): Promise<Aggregate<Commands>> {
    return UnitOfWork.sync(
      this._definition,
      this._eventStore,
      this._snapshotStore,
      this._eventCreators,
      options,
    );
  }
}

export class UnitOfWork<State, Commands, Events> {
  private _definition: DomainDefinition<State, Commands, Events>;
  private _eventStore: EventStore<DomainUnionType<Events>>;
  private _snapshotStore: SnapshotStore<State>;
  private _eventCreators: DomainUnionFunctions<Events>;
  private _subject: string;
  private _state: State;
  private _cookie: string | undefined;
  private _events: DomainUnionType<Events>[];

  static async sync<State, Commands, Events>(
    definition: DomainDefinition<State, Commands, Events>,
    eventStore: EventStore<DomainUnionType<Events>>,
    snapshotStore: SnapshotStore<State>,
    eventCreators: DomainUnionFunctions<Events>,
    options: DomainFetchOptions,
  ): Promise<Aggregate<Commands>> {
    const response = await snapshotStore.query({
      subject: options.id,
      signal: options.signal,
    });

    const [state, cookie] = response
      ? [response.snapshot, response.cookie]
      : [definition.defaultState, undefined];

    const work: any = new UnitOfWork(
      definition,
      eventStore,
      snapshotStore,
      eventCreators,
      options.id,
      state,
      cookie,
    );

    for (const type of Object.getOwnPropertyNames(definition.commands)) {
      work[type] = (payload: unknown) => work.process({ type, payload });
    }

    return work;
  }

  constructor(
    definition: DomainDefinition<State, Commands, Events>,
    eventStore: EventStore<DomainUnionType<Events>>,
    snapshotStore: SnapshotStore<State>,
    eventCreators: DomainUnionFunctions<Events>,
    subject: string,
    state: State,
    cookie: string | undefined,
  ) {
    this._definition = definition;
    this._eventStore = eventStore;
    this._snapshotStore = snapshotStore;
    this._eventCreators = eventCreators;
    this._subject = subject;
    this._state = state;
    this._cookie = cookie;
    this._events = [];
  }

  process(command: DomainUnionType<Commands>) {
    const events = this._definition.commands[command.type]({
      command: command.payload,
      events: this._eventCreators,
      state: this._state,
    });

    this._reduce(events);
  }

  async save(options: AggregateSaveOptions = {}): Promise<void> {
    const response = await this._eventStore.save({
      subject: this._subject,
      cookie: this._cookie,
      events: this._events,
      signal: options.signal,
    });

    await this._hydrate(response);

    await this._snapshotStore.save({
      snapshot: this._state,
      cookie: this._cookie as string,
      subject: this._subject,
      signal: options.signal,
    });
  }

  private async _hydrate(
    response: EventStoreIterator<DomainUnionType<Events>>,
  ) {
    this._events = [];
    this._cookie = response.cookie;
    this._reduce(response.records.map((record) => record.event));
  }

  private async _reduce(events: readonly DomainUnionType<Events>[]) {
    for (const event of events) {
      this._events.push(event);

      this._state = this._definition.events[event.type]({
        state: this._state,
        event: event.payload,
      });
    }
  }
}

function creatorsOf<Map>(
  map: Record<keyof Map, unknown>,
): DomainUnionFunctions<Map> {
  const creators: Record<string, unknown> = {};

  for (const type of Object.getOwnPropertyNames(map)) {
    creators[type] = (payload: unknown) => ({ type, payload });
  }

  return creators as DomainUnionFunctions<Map>;
}

export interface DomainDefinition<State, Commands, Events> {
  readonly defaultState: State;
  readonly commands: DomainCommandsDefinition<State, Commands, Events>;
  readonly events: DomainEventsDefinition<State, Events>;
}

export type DomainCommandsDefinition<State, Commands, Events> = {
  [K in keyof Commands]: (
    context: DomainCommandContext<State, Commands[K], Events>,
  ) => DomainUnionType<Events>[];
};

export interface DomainCommandContext<State, Command, Events> {
  readonly state: State;
  readonly command: Command;
  readonly events: DomainUnionFunctions<Events>;
}

export type DomainEventsDefinition<State, Events> = {
  [K in keyof Events]: (context: DomainEventContext<State, Events[K]>) => State;
};

export interface DomainEventContext<State, Event> {
  readonly state: State;
  readonly event: Event;
}

export type DomainUnionType<Map> = {
  [K in keyof Map]: { readonly type: K; readonly payload: Map[K] };
}[keyof Map];

export type DomainCommands<Map> = {
  [K in keyof Map]: (payload: Map[K]) => void;
};

export type DomainUnionFunctions<Map> = {
  [K in keyof Map]: (payload: Map[K]) => DomainUnionType<Map>;
};

export interface DomainFetchOptions {
  readonly id: string;
  readonly signal?: AbortSignal;
}

export type Aggregate<Commands> = DomainCommands<Commands> & {
  save(options?: AggregateSaveOptions): Promise<void>;
};

export interface AggregateSaveOptions {
  readonly signal?: AbortSignal;
}
