# Stage 1 — Notification System Design

## Problem

Students receive a high volume of campus notifications (Placements, Results, Events). The goal is to surface the **top-n most important unread notifications** in a Priority Inbox, and keep that inbox efficiently updated as new notifications stream in.

---

## Scoring Model

Each notification receives a **priority score** that combines:

1. **Type weight** — reflects importance hierarchy:
   | Type      | Weight |
   |-----------|--------|
   | Placement | 3      |
   | Result    | 2      |
   | Event     | 1      |

2. **Recency factor** — exponential decay so fresh notifications get a boost:

   ```
   recencyFactor = exp(−ageMs / DECAY_HALF_LIFE)   ∈ (0, 1]
   DECAY_HALF_LIFE = 1 hour
   ```

3. **Final score:**

   ```
   score = typeWeight × (1 + recencyFactor)
   ```

   Range: `[1, 6]` (Event, infinitely old → Placement, brand new).
   This ensures Placements always outrank Events of the same age, while a very fresh Event can outrank an old Result.

---

## Data Structure — Min-Heap of Size n

To maintain the **top-n** efficiently as new notifications arrive we use a **min-heap of capacity n**.

### Why a min-heap?

| Goal | Structure | Why |
|---|---|---|
| Keep top-n | Min-heap (size n) | Root = current lowest score in the top-n window |
| Insert new notification | O(log n) | Compare with root; evict root if new > root |
| Extract sorted top-n | O(n log n) | One-time sort at read time |
| Memory | O(n) | Only n items stored regardless of total m |

### Algorithm

```
heap = MinHeap(capacity = n)

for each notification in stream:
    score = computeScore(notification)
    if heap.size < n:
        heap.push(notification, score)        // O(log n)
    elif score > heap.root.score:
        heap.replaceRoot(notification, score) // O(log n)  — evict weakest
    // else: notification doesn't make the cut — skip O(1)

result = heap.extractAllDescending()          // O(n log n)
```

### Complexity

| Operation | Time |
|---|---|
| Process m notifications | O(m log n) |
| Extract sorted top-n | O(n log n) |
| Space | O(n) |

For m = 10 000 notifications and n = 10, this is **~130 000 comparisons** vs 10 000 × 10 = 100 000 for a naïve sorted array approach — but the heap avoids copying the full array and handles streaming naturally.

---

## Handling Continuous New Notifications

As new notifications arrive (e.g. via polling or WebSocket):

1. Each incoming notification is scored and offered to the heap in **O(log n)**.
2. If its score beats the current minimum in the top-n, the minimum is evicted and the new notification takes its place.
3. The heap self-balances; no full re-sort is needed.
4. On the frontend, the hook polls the API every **30 seconds** and diffs IDs to detect genuinely new items, marking them with a "NEW" badge until the user views them.

---

## API Integration

```
GET http://20.207.122.201/evaluation-service/notifications
  ?page=<n>
  &limit=<n>
  &notification_type=Placement|Result|Event
```

The priority computation is done **client-side** (or in the backend service) after fetching a sufficiently large batch (limit = 100), keeping the API stateless.

---

## Frontend Architecture (Stage 2)

| Page | Route | Description |
|---|---|---|
| All Notifications | `/` | Paginated list with type filter; new/unread badge |
| Priority Inbox | `/priority` | Top-n slider (5–30), type filter, priority scores shown |

- **New vs. viewed** — tracked via an in-memory `Set<string>` of seen IDs (persisted via `useRef` across re-renders, resets on page refresh by design — no backend auth required).
- **MUI** used throughout: `AppBar`, `Card`, `Chip`, `Pagination`, `Slider`, `Select`, `Badge`.
- **Responsive** — `Container maxWidth="md"` + `flexWrap` everywhere for mobile compatibility.

---

## Directory Structure

```
repo/
├── logging_middleware/
│   ├── logger.ts          ← reusable structured logger
│   ├── logger.test.ts
│   └── package.json
├── notification_app_be/
│   ├── priorityInbox.ts   ← Stage 1: min-heap priority engine + CLI output
│   └── package.json
├── notification_app_fe/
│   └── src/
│       ├── utils/
│       │   ├── logger.ts          ← browser-safe mirror of logging middleware
│       │   └── notifications.ts   ← scoring + heap logic
│       ├── hooks/
│       │   └── useNotifications.ts
│       ├── components/
│       │   └── NotificationCard.tsx
│       └── pages/
│           ├── _app.tsx           ← MUI ThemeProvider
│           ├── index.tsx          ← All Notifications
│           └── priority.tsx       ← Priority Inbox
└── Notification_System_Design.md
```

---

## Logging

Every meaningful operation (API fetch, score computation, heap push/evict, page navigation, filter change) is logged via the **Logging Middleware** created in the Pre-Test Setup stage. No `console.log` or built-in loggers are used directly.
