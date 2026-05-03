import { put, list } from '@vercel/blob';
import { ReportData } from './types';
import * as fs from 'fs';
import * as path from 'path';

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data');

function ensureLocalDir() {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
}

export async function saveReport(data: ReportData): Promise<string> {
  const filename = `reports/${data.report_date}.json`;
  const content = JSON.stringify(data, null, 2);

  if (IS_VERCEL) {
    const blob = await put(filename, content, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  ensureLocalDir();
  const filePath = path.join(LOCAL_DATA_DIR, `${data.report_date}.json`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export async function loadReport(date: string): Promise<ReportData | null> {
  if (IS_VERCEL) {
    try {
      const filename = `reports/${date}.json`;
      const blobResult = await list({ prefix: filename });
      if (blobResult.blobs.length === 0) return null;
      const resp = await fetch(blobResult.blobs[0].downloadUrl);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  ensureLocalDir();
  const filePath = path.join(LOCAL_DATA_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export async function listReports(): Promise<string[]> {
  if (IS_VERCEL) {
    try {
      const blobResult = await list({ prefix: 'reports/' });
      return blobResult.blobs
        .map(b => b.pathname.replace('reports/', '').replace('.json', ''))
        .filter(Boolean)
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  ensureLocalDir();
  if (!fs.existsSync(LOCAL_DATA_DIR)) return [];
  return fs.readdirSync(LOCAL_DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse();
}

export async function loadLatestReport(): Promise<ReportData | null> {
  const dates = await listReports();
  if (!dates.length) return null;
  return loadReport(dates[0]);
}
