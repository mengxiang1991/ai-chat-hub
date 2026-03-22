import Store from 'electron-store';

interface StoreSchema {
  platformSessions: Record<string, { storageStatePath?: string }>;
  userConfig: {
    theme?: 'light' | 'dark';
  };
}

const store = new Store<StoreSchema>({
  defaults: {
    platformSessions: {},
    userConfig: { theme: 'light' },
  },
});

export default store;
