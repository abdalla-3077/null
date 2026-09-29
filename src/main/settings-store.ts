import Store from 'electron-store';
import { DEFAULT_SETTINGS, type AppSettings } from '../shared/types';

const store = new Store<AppSettings>({ defaults: DEFAULT_SETTINGS });

export function getAllSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...store.store };
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return store.get(key, DEFAULT_SETTINGS[key]);
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  store.set(key, value);
}

export function resetSettings(): void {
  store.clear();
}
