import type { NullBrowserApi, NullSettingsApi } from '../preload';

declare global {
  interface Window {
    nullBrowser: NullBrowserApi;
    nullSettings: NullSettingsApi;
  }
}

export {};
