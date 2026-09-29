import { app, session } from 'electron';
import { clearTabsSessionData } from './tab-manager';
import { clearAiSessionData } from './ai-panel-manager';

const KNOWN_PARTITIONS = ['null-ai'];

export async function clearPrivacyData(): Promise<void> {
  await clearTabsSessionData();
  await clearAiSessionData();
  for (const p of KNOWN_PARTITIONS) {
    try {
      const ses = session.fromPartition(p);
      await ses.clearStorageData();
      await ses.clearCache();
    } catch {
      /* ignore */
    }
  }
  try {
    await session.defaultSession?.clearCache();
  } catch {
    /* ignore */
  }
}

export async function cleanupOnQuit(): Promise<void> {
  try {
    await clearPrivacyData();
  } catch {
    /* ignore */
  }
  try {
    app.releaseSingleInstanceLock?.();
  } catch {
    /* ignore */
  }
  void app;
}
