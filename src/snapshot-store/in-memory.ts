import {
  type SnapshotStore,
  type SnapshotStoreQueryOptions,
  type SnapshotStoreRecord,
  type SnapshotStoreSaveOptions,
} from ".";

export class InMemorySnapshotStore<Snapshot>
  implements SnapshotStore<Snapshot>
{
  private _records: Record<string, SnapshotStoreRecord<Snapshot>>;

  constructor() {
    this._records = {};
  }

  async query(
    options: SnapshotStoreQueryOptions,
  ): Promise<SnapshotStoreRecord<Snapshot> | undefined> {
    return this._records[options.subject];
  }

  async save(options: SnapshotStoreSaveOptions<Snapshot>): Promise<void> {
    this._records[options.subject] = {
      subject: options.subject,
      cookie: options.cookie,
      snapshot: options.snapshot,
    };
  }
}
