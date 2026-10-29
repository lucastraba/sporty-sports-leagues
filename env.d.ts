/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional TheSportsDB premium key. Without it the free key "123" is used. */
  readonly VITE_SPORTSDB_API_KEY?: string
}
