export interface WatchHistoryEntry {
  id: string;
  timestamp: number;
  durationStr: string;
  seconds: number;
  siteId?: string;
  siteName?: string;
}

export interface ActivityLogEntry {
  type: string;
  id?: string;
  tags?: string[];
  ts: number;
}

export interface HistorySession {
  id?: string;
  items?: string[];
  startTime?: number;
  lastActive?: number;
  durationSeconds?: number;
}

export interface CustomSite {
  id: string;
  name: string;
  url: string;
}

export interface UserProfile {
  subscription?: string;
  expiresAt?: { toDate?: () => Date } | string | number | null;
  sponsorNameSet?: boolean;
  favorites?: string[];
  blacklist?: string[];
  watchLater?: string[];
  tagScores?: Record<string, number>;
  history?: HistorySession[];
  activityLog?: ActivityLogEntry[];
  watchHistory?: WatchHistoryEntry[];
  customSites?: CustomSite[];
  customMods?: string[];
  modifiersPool?: string[];
  exploredCount?: number;
  lastUpdated?: { toDate?: () => Date } | string | number | null;
  email?: string;
}
