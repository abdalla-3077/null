import type { NullBrowserApi, NullSettingsApi } from '../preload';

declare global {
  interface Window {
    nullBrowser: NullBrowserApi;
    nullSettings: NullSettingsApi;
  }
}

declare module '*.png' {
  const src: string;
  export default src;
}

export {};
