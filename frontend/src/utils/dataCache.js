// Lightweight in-memory SWR cache store for instant tab switching and background revalidation
const cacheStore = new Map();

export const dataCache = {
  getCache: (key) => {
    return cacheStore.get(key) || null;
  },
  setCache: (key, data) => {
    cacheStore.set(key, data);
  },
  clearCache: (key) => {
    if (key) {
      cacheStore.delete(key);
    } else {
      cacheStore.clear();
    }
  }
};
