import type { NullBrowserApi, NullSettingsApi, NullStudyApi } from '../preload';

declare global {
  interface Window {
    nullBrowser: NullBrowserApi;
    nullSettings: NullSettingsApi;
    nullStudy: NullStudyApi;
  }
}

declare module '*.png' {
  const src: string;
  export default src;
}

export {};
