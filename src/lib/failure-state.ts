import { put, list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILENAME = 'state/failure-state.json';
const LOCAL_STATE_PATH = path.join(LOCAL_DATA_DIR, 'failure-state.json');

export interface FailureState {
  consecutiveFailures: number;
  lastFailureDate: string;
  lastError: string;
}

function emptyState(): FailureState {
  return { consecutiveFailures: 0, lastFailureDate: '', lastError: '' };
}

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

export async function getFailureState(): Promise<FailureState> {
  if (IS_VERCEL) {
    try {
      const { blobs } = await list({ prefix: STATE_FILENAME });
      if (!blobs.length) return emptyState();
      const resp = await fetch(blobs[0].url);
      if (!resp.ok) return emptyState();
      return await resp.json();
    } catch {
      return emptyState();
    }
  }

  ensureLocalDir();
  if (!fs.existsSync(LOCAL_STATE_PATH)) return emptyState();
  try {
    return JSON.parse(fs.readFileSync(LOCAL_STATE_PATH, 'utf-8'));
  } catch {
    return emptyState();
  }
}

export async function recordFailure(error: string): Promise<number> {
  const prev = await getFailureState();
  const next: FailureState = {
    consecutiveFailures: prev.consecutiveFailures + 1,
    lastFailureDate: new Date().toISOString().slice(0, 10),
    lastError: error,
  };

  const content = JSON.stringify(next, null, 2);

  if (IS_VERCEL) {
    await put(STATE_FILENAME, content, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    ensureLocalDir();
    fs.writeFileSync(LOCAL_STATE_PATH, content, 'utf-8');
  }

  return next.consecutiveFailures;
}

export async function resetFailureState(): Promise<void> {
  const state = emptyState();
  const content = JSON.stringify(state, null, 2);

  if (IS_VERCEL) {
    await put(STATE_FILENAME, content, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    ensureLocalDir();
    fs.writeFileSync(LOCAL_STATE_PATH, content, 'utf-8');
  }
}
