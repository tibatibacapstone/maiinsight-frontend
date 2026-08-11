export const META_SOURCE_ID = "2"

export const isSourceSyncDisabled = ({
  sourceId,
  sourceStatus,
  syncingSourceId,
  metaConfigured,
  canSync,
}) => {
  if (syncingSourceId === sourceId) return true

  if (sourceId === META_SOURCE_ID) {
    return sourceStatus === "syncing" || !metaConfigured || !canSync
  }

  return sourceStatus === "error"
}

export const getSourceSyncLabel = ({ sourceId, sourceStatus, syncingSourceId }) => {
  if (
    syncingSourceId === sourceId ||
    (sourceId === META_SOURCE_ID && sourceStatus === "syncing")
  ) {
    return "Syncing..."
  }
  if (sourceId === META_SOURCE_ID && sourceStatus === "error") return "Retry Sync"
  return "Sync Now"
}
