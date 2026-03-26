/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_API_URL?: string
  readonly VITE_ANALYTICS_INGEST_SECRET?: string
  /** Set `'true'` to skip Mongo POST in dev (local SQLite only). */
  readonly VITE_DISABLE_REMOTE_ANALYTICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
