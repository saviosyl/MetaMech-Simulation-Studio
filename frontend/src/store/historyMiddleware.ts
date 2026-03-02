import { StoreApi } from 'zustand';

interface HistoryState {
  past: any[];
  future: any[];
}

const MAX_HISTORY = 50;
const TRACKED_KEYS = ['processNodes', 'environmentAssets', 'actors', 'edges'];

function getSnapshot(state: any) {
  const snap: any = {};
  for (const key of TRACKED_KEYS) {
    snap[key] = JSON.parse(JSON.stringify(state[key]));
  }
  return snap;
}

function snapshotsEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

let history: HistoryState = { past: [], future: [] };
let lastSnapshot: any = null;
let skipNext = false;

export function pushHistory(state: any) {
  if (skipNext) { skipNext = false; return; }
  const snap = getSnapshot(state);
  if (lastSnapshot && snapshotsEqual(snap, lastSnapshot)) return;
  if (lastSnapshot) {
    history.past.push(lastSnapshot);
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future = [];
  }
  lastSnapshot = snap;
}

export function undo(set: StoreApi<any>['setState'], get: () => any) {
  if (history.past.length === 0) return;
  const current = getSnapshot(get());
  history.future.push(current);
  const prev = history.past.pop()!;
  lastSnapshot = prev;
  skipNext = true;
  set(prev);
}

export function redo(set: StoreApi<any>['setState'], get: () => any) {
  if (history.future.length === 0) return;
  const current = getSnapshot(get());
  history.past.push(current);
  const next = history.future.pop()!;
  lastSnapshot = next;
  skipNext = true;
  set(next);
}

export function canUndo() { return history.past.length > 0; }
export function canRedo() { return history.future.length > 0; }

export function resetHistory() {
  history = { past: [], future: [] };
  lastSnapshot = null;
}
