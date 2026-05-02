import { createLogger } from "./logger";

const logger = createLogger("notification-priority-service", "DEBUG", true);

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = "Placement" | "Result" | "Event";

export interface Notification {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string; // "YYYY-MM-DD HH:mm:ss"
}

export interface ScoredNotification extends Notification {
  score: number;
}

// ── Weights ──────────────────────────────────────────────────────────────────

const TYPE_WEIGHT: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

const RECENCY_DECAY_MS = 60 * 60 * 1000; // 1 hour half-life (tuneable)

/**
 * Score = typeWeight * recencyFactor
 *
 * recencyFactor uses an exponential decay so very recent notifications
 * get a boost but the type hierarchy still dominates for old items.
 *   recencyFactor = exp(-ageMs / RECENCY_DECAY_MS)   →  [0, 1]
 *
 * Final score range:
 *   Placement newest  ≈ 3.0
 *   Result    newest  ≈ 2.0
 *   Event     newest  ≈ 1.0
 *   (all decay toward 0 as age → ∞)
 */
function computeScore(n: Notification, now: Date = new Date()): number {
  const tsMs = new Date(n.Timestamp.replace(" ", "T") + "Z").getTime();
  const ageMs = Math.max(0, now.getTime() - tsMs);
  const recencyFactor = Math.exp(-ageMs / RECENCY_DECAY_MS);
  const weight = TYPE_WEIGHT[n.Type] ?? 1;
  const score = weight * (1 + recencyFactor); // base weight + recency bonus
  logger.debug("Scored notification", {
    id: n.ID,
    type: n.Type,
    ageMs,
    recencyFactor: +recencyFactor.toFixed(4),
    score: +score.toFixed(4),
  });
  return score;
}

// ── Min-Heap (keyed on score) ────────────────────────────────────────────────
// A min-heap of size n lets us maintain the TOP-n in O(log n) per insertion.
// The root is always the *lowest-scored* item in the top-n window, so we can
// cheaply decide whether a new notification deserves a spot.

class MinHeap {
  private heap: ScoredNotification[] = [];
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    logger.debug("MinHeap initialised", { capacity });
  }

  get size(): number {
    return this.heap.length;
  }

  private parent(i: number) {
    return Math.floor((i - 1) / 2);
  }
  private left(i: number) {
    return 2 * i + 1;
  }
  private right(i: number) {
    return 2 * i + 2;
  }

  private swap(i: number, j: number) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = this.parent(i);
      if (this.heap[p].score <= this.heap[i].score) break;
      this.swap(i, p);
      i = p;
    }
  }

  private siftDown(i: number) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = this.left(i);
      const r = this.right(i);
      if (l < n && this.heap[l].score < this.heap[smallest].score) smallest = l;
      if (r < n && this.heap[r].score < this.heap[smallest].score) smallest = r;
      if (smallest === i) break;
      this.swap(i, smallest);
      i = smallest;
    }
  }

  /** Insert a notification; evict the lowest-scored one if over capacity. */
  push(item: ScoredNotification): void {
    if (this.heap.length < this.capacity) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
      logger.debug("Heap push (under capacity)", {
        id: item.ID,
        heapSize: this.heap.length,
      });
    } else if (this.heap.length > 0 && item.score > this.heap[0].score) {
      // New item beats the minimum in the top-n → replace root
      const evicted = this.heap[0];
      this.heap[0] = item;
      this.siftDown(0);
      logger.debug("Heap push (evicted minimum)", {
        incoming: item.ID,
        evicted: evicted.ID,
        incomingScore: +item.score.toFixed(4),
        evictedScore: +evicted.score.toFixed(4),
      });
    } else {
      logger.debug("Heap push skipped (score too low)", {
        id: item.ID,
        score: +item.score.toFixed(4),
        heapMin: this.heap.length ? +this.heap[0].score.toFixed(4) : null,
      });
    }
  }

  /** Extract all elements sorted descending (highest priority first). */
  extractSorted(): ScoredNotification[] {
    const result: ScoredNotification[] = [];
    // Clone heap so original is not mutated
    const copy = [...this.heap];
    while (copy.length > 0) {
      // pop max by repeatedly swapping root with last & sifting
      const last = copy.pop()!;
      if (copy.length === 0) {
        result.push(last);
        break;
      }
      result.push(copy[0]);
      copy[0] = last;
      // sift-down on copy
      let i = 0;
      while (true) {
        const n = copy.length;
        let sm = i;
        const l = 2 * i + 1,
          r = 2 * i + 2;
        if (l < n && copy[l].score < copy[sm].score) sm = l;
        if (r < n && copy[r].score < copy[sm].score) sm = r;
        if (sm === i) break;
        [copy[i], copy[sm]] = [copy[sm], copy[i]];
        i = sm;
      }
    }
    return result.reverse(); // highest score first
  }
}

// ── Priority Inbox Service ───────────────────────────────────────────────────

const API_URL = "http://20.207.122.201/evaluation-service/notifications";

async function fetchNotifications(): Promise<Notification[]> {
  logger.info("Fetching notifications from API", { url: API_URL });
  const res = await fetch(API_URL);
  if (!res.ok) {
    logger.error("API fetch failed", { status: res.status, url: API_URL });
    throw new Error(`API returned ${res.status}`);
  }
  const json = (await res.json()) as { notifications: Notification[] };
  logger.info("Notifications fetched successfully", {
    count: json.notifications.length,
  });
  return json.notifications;
}

/**
 * Returns the top-n priority notifications from the given list.
 * Uses a min-heap to achieve O(m log n) time where m = total notifications.
 */
export function getTopN(
  notifications: Notification[],
  n: number,
  now: Date = new Date()
): ScoredNotification[] {
  logger.info("Computing top-N priority notifications", {
    total: notifications.length,
    n,
  });

  const heap = new MinHeap(n);

  for (const notif of notifications) {
    const score = computeScore(notif, now);
    heap.push({ ...notif, score });
  }

  const result = heap.extractSorted();
  logger.info("Top-N computation complete", {
    requested: n,
    returned: result.length,
  });
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  logger.info("Priority Inbox Service starting");

  let notifications: Notification[];
  try {
    notifications = await fetchNotifications();
  } catch (err) {
    logger.warn("API unavailable, using mock data for demonstration", {
      error: String(err),
    });

    // Sample mock data (mirrors the structure from the assessment)
    notifications = [
      {
        ID: "d146095a-0d86-4a34-9e69-3900a14576bc",
        Type: "Result",
        Message: "mid-sem",
        Timestamp: "2026-04-22 17:51:30",
      },
      {
        ID: "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
        Type: "Placement",
        Message: "CSX Corporation hiring",
        Timestamp: "2026-04-22 17:51:18",
      },
      {
        ID: "81589ada-0ad3-4f77-9554-f52fb558e09d",
        Type: "Event",
        Message: "farewell",
        Timestamp: "2026-04-22 17:51:06",
      },
      {
        ID: "0005513a-142b-4bbc-8678-eefec65e1ede",
        Type: "Result",
        Message: "mid-sem",
        Timestamp: "2026-04-22 17:50:54",
      },
      {
        ID: "ea836726-c25e-4f21-a72f-544a6af8a37f",
        Type: "Result",
        Message: "project-review",
        Timestamp: "2026-04-22 17:50:42",
      },
      {
        ID: "003cb427-8fc6-47f7-bb00-be228f6b0d2c",
        Type: "Result",
        Message: "external",
        Timestamp: "2026-04-22 17:50:30",
      },
      {
        ID: "e5c4ff20-31bf-4d40-8f02-72fda59e8918",
        Type: "Result",
        Message: "project-review",
        Timestamp: "2026-04-22 17:50:18",
      },
      {
        ID: "1cfce5ee-ad37-4894-8946-d707627176a5",
        Type: "Event",
        Message: "tech-fest",
        Timestamp: "2026-04-22 17:50:06",
      },
      {
        ID: "cf2885a-45ac-4ba0-b548-6e9e9d4c52c8",
        Type: "Result",
        Message: "project-review",
        Timestamp: "2026-04-22 17:49:54",
      },
      {
        ID: "8a7412bd-6065-4d09-8501-a37f11cc848b",
        Type: "Placement",
        Message: "Advanced Micro Devices Inc. hiring",
        Timestamp: "2026-04-22 17:49:42",
      },
      {
        ID: "f1000000-0000-0000-0000-000000000001",
        Type: "Placement",
        Message: "Google hiring SWE interns",
        Timestamp: "2026-04-22 17:52:00",
      },
      {
        ID: "f1000000-0000-0000-0000-000000000002",
        Type: "Event",
        Message: "Annual Sports Day",
        Timestamp: "2026-04-22 17:48:00",
      },
      {
        ID: "f1000000-0000-0000-0000-000000000003",
        Type: "Result",
        Message: "end-semester results",
        Timestamp: "2026-04-22 17:52:30",
      },
      {
        ID: "f1000000-0000-0000-0000-000000000004",
        Type: "Placement",
        Message: "Microsoft hiring",
        Timestamp: "2026-04-22 17:47:00",
      },
      {
        ID: "f1000000-0000-0000-0000-000000000005",
        Type: "Event",
        Message: "Cultural Fest 2026",
        Timestamp: "2026-04-22 17:45:00",
      },
    ];
  }

  const TOP_N = 10;
  // Use a fixed reference time so output is deterministic for the mock data
  const referenceTime = new Date("2026-04-22T17:53:00Z");
  const topNotifications = getTopN(notifications, TOP_N, referenceTime);

  console.log("\n" + "═".repeat(80));
  console.log(`  🔔  PRIORITY INBOX — TOP ${TOP_N} NOTIFICATIONS`);
  console.log("═".repeat(80));

  topNotifications.forEach((n, i) => {
    const badge =
      n.Type === "Placement" ? "🏢" : n.Type === "Result" ? "📊" : "🎉";
    console.log(
      `  ${String(i + 1).padStart(2, " ")}. ${badge} [${n.Type.padEnd(9)}] ${n.Message.padEnd(35)} ` +
        `Score: ${n.score.toFixed(4)}  |  ${n.Timestamp}`
    );
  });

  console.log("═".repeat(80) + "\n");

  logger.info("Priority Inbox display complete", { shownCount: topNotifications.length });
}

main().catch((err) => {
  logger.error("Unhandled error in main", { error: String(err) });
  process.exit(1);
});
