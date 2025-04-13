export interface SnapshotStore<Snapshot> {
  query(
    options: SnapshotStoreQueryOptions,
  ): Promise<SnapshotStoreRecord<Snapshot> | undefined>;

  save(options: SnapshotStoreSaveOptions<Snapshot>): Promise<void>;
}

export interface SnapshotStoreQueryOptions {
  readonly subject: string;
  readonly signal?: AbortSignal;
}

export interface SnapshotStoreSaveOptions<Snapshot>
  extends SnapshotStoreRecord<Snapshot> {
  readonly signal?: AbortSignal;
}

export interface SnapshotStoreRecord<Snapshot> {
  readonly subject: string;
  readonly cookie: string;
  readonly snapshot: Snapshot;
}
