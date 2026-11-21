export const SYNC_KEYS = {
  LAST_SYNC_TS: 'xch_last_sync_ts',
  LOCAL_UPDATE_TS: 'xch_local_update_ts',
  SUB_LEVEL: 'xch_sub_level',
  FAVORITES: 'xch_favorites',
  BLACKLIST: 'xch_blacklist',
  WATCH_LATER: 'xch_watch_later',
  TAG_SCORES: 'xch_tag_scores',
  HISTORY: 'xch_history',
  WATCH_HISTORY: 'xch_watch_history',
  ACTIVITY_LOG: 'xch_activity_log',
  PERMANENT_EXPLORED: 'xch_permanent_explored',
  CUSTOM_SITES: 'xch_custom_sites',
  CUSTOM_MODS: 'xch_custom_mods',
  USER_MODS: 'xch_user_mods',
  PLATFORM: 'xch_platform',
  LANG: 'xch_lang',
  THEME_ID: 'xch_theme_id',
} as const;

export function safeJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
