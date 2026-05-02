export type NotificationType = "Placement" | "Result" | "Event";

export interface Notification {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

export interface ScoredNotification extends Notification {
  score: number;
}

const TYPE_WEIGHT: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

const RECENCY_DECAY_MS = 60 * 60 * 1000;

export function computeScore(n: Notification, now: Date = new Date()): number {
  const tsMs = new Date(n.Timestamp.replace(" ", "T") + "Z").getTime();
  const ageMs = Math.max(0, now.getTime() - tsMs);
  const recencyFactor = Math.exp(-ageMs / RECENCY_DECAY_MS);
  const weight = TYPE_WEIGHT[n.Type] ?? 1;
  return weight * (1 + recencyFactor);
}

export function getTopN(notifications: Notification[], n: number): ScoredNotification[] {
  const now = new Date();
  const heap: ScoredNotification[] = [];

  const bubbleUp = (i: number) => {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (heap[p].score <= heap[i].score) break;
      [heap[i], heap[p]] = [heap[p], heap[i]];
      i = p;
    }
  };

  const siftDown = (i: number) => {
    while (true) {
      let sm = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < heap.length && heap[l].score < heap[sm].score) sm = l;
      if (r < heap.length && heap[r].score < heap[sm].score) sm = r;
      if (sm === i) break;
      [heap[i], heap[sm]] = [heap[sm], heap[i]];
      i = sm;
    }
  };

  for (const notif of notifications) {
    const score = computeScore(notif, now);
    const item: ScoredNotification = { ...notif, score };
    if (heap.length < n) {
      heap.push(item);
      bubbleUp(heap.length - 1);
    } else if (heap.length > 0 && score > heap[0].score) {
      heap[0] = item;
      siftDown(0);
    }
  }

  return [...heap].sort((a, b) => b.score - a.score);
}