import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "supplysetu.response-cache";

type CacheEnvelope = {
  expiresAt: number;
  body: unknown;
};

type CacheRecord = Record<string, CacheEnvelope>;

let inMemoryCache: CacheRecord = {};

export const hydrateCacheStore = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);

    if (!raw) {
      return;
    }

    inMemoryCache = JSON.parse(raw) as CacheRecord;
  } catch (error) {
    // Drop corrupt cache entries so the app can always finish bootstrapping.
    console.warn("Failed to hydrate response cache, clearing persisted cache.", error);
    inMemoryCache = {};
    await AsyncStorage.removeItem(CACHE_KEY);
  }
};

const persist = async () => {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(inMemoryCache));
};

export const responseCache = {
  async get(key: string) {
    const entry = inMemoryCache[key];

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      delete inMemoryCache[key];
      await persist();
      return null;
    }

    return entry;
  },

  async set(key: string, body: unknown, ttlMs: number) {
    inMemoryCache[key] = {
      body,
      expiresAt: Date.now() + ttlMs
    };
    await persist();
  },

  async clear() {
    inMemoryCache = {};
    await AsyncStorage.removeItem(CACHE_KEY);
  }
};
