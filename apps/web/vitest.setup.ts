// Mock localStorage for Zustand persist middleware in Node test environment
const localStorageStore = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => localStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore.set(key, value);
    },
    removeItem: (key: string) => {
      localStorageStore.delete(key);
    },
    clear: () => {
      localStorageStore.clear();
    },
    get length() {
      return localStorageStore.size;
    },
    key: (index: number) => [...localStorageStore.keys()][index] ?? null,
  },
  writable: true,
});
