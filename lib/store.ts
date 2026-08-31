import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { applyRetention, type RateBucket, type StoredSubmission } from "./formshield";

const DATA_FILE = path.join(process.cwd(), "data", "submissions.json");

type StoreFile = {
  submissions: StoredSubmission[];
};

const g = globalThis as unknown as {
  __formShieldBuckets?: Map<string, RateBucket>;
};

function readFile(): StoreFile {
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as StoreFile;
    if (!Array.isArray(raw.submissions)) throw new Error("invalid");
    return raw;
  } catch {
    return { submissions: [] };
  }
}

function writeFile(data: StoreFile): void {
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

export function getBuckets() {
  if (!g.__formShieldBuckets) g.__formShieldBuckets = new Map();
  return g.__formShieldBuckets;
}

export function listSubmissions(): StoredSubmission[] {
  return readFile().submissions;
}

/** Apply retention, persist the survivors, return them (ciphertext unchanged). */
export function listLiveSubmissions(): StoredSubmission[] {
  const map = new Map(listSubmissions().map((r) => [r.id, r]));
  applyRetention(map);
  const live = [...map.values()];
  saveSubmissions(live);
  return live;
}

export function saveSubmissions(rows: StoredSubmission[]): void {
  writeFile({ submissions: rows });
}

export function upsertSubmission(row: StoredSubmission): void {
  const rows = listSubmissions().filter((r) => r.id !== row.id);
  rows.push(row);
  saveSubmissions(rows);
}
