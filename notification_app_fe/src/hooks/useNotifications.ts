import { useState, useEffect, useCallback, useRef } from "react";
import { Notification, NotificationType } from "../utils/notifications";
import { createLogger } from "../utils/logger";

const logger = createLogger("useNotifications");

const API_BASE = "http://20.207.122.201/evaluation-service/notifications";
const POLL_INTERVAL_MS = 30_000; // poll every 30s for new notifications

interface FetchParams {
  page?: number;
  limit?: number;
  notification_type?: NotificationType | "";
}

interface ApiResponse {
  notifications: Notification[];
  total?: number;
}

export function useNotifications(params: FetchParams = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const seenIds = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

 const fetchData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const url = new URL(API_BASE);
        url.searchParams.set("page",  String(params.page ?? 1));
        url.searchParams.set("limit", String(params.limit ?? 10));
        if (params.notification_type)
          url.searchParams.set("notification_type", params.notification_type);

        logger.info("Fetching notifications", {
          url: url.toString(),
          silent,
          params,
        });

     const res = await fetch(url.toString(), {
  headers: {
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJqczQwNkBzcm1pc3QuZWR1LmluIiwiZXhwIjoxNzc3NzAxNzE2LCJpYXQiOjE3Nzc3MDA4MTYsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiIxMTI1OGE2OC1mZjJiLTQ4MDAtOTc0NC1mYjVlYTRmMmE2YzAiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJqYWlzaCBzaWRkaW5lbmkiLCJzdWIiOiIxMzY1YmY4My0xODhiLTQwNjItOGYxNC00ZjBmMjNkYmE0ZGEifSwiZW1haWwiOiJqczQwNkBzcm1pc3QuZWR1LmluIiwibmFtZSI6ImphaXNoIHNpZGRpbmVuaSIsInJvbGxObyI6InJhMjMxMTAwMzAxMDYzMiIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjEzNjViZjgzLTE4OGItNDA2Mi04ZjE0LTRmMGYyM2RiYTRkYSIsImNsaWVudFNlY3JldCI6Ik5rWnBNdlNBZFR4UlpYcHUifQ.Oih_3KFISm8AOSqtN-NvVZZpHE0so3WmiCQLn9fCN84",
  },
});
        if (!res.ok) {
          throw new Error(`API error ${res.status}: ${res.statusText}`);
        }
        const data: ApiResponse = await res.json();
        const fetched = data.notifications ?? [];

        // Detect genuinely new IDs
        const freshIds = new Set<string>();
        fetched.forEach((n) => {
          if (!seenIds.current.has(n.ID)) {
            freshIds.add(n.ID);
            seenIds.current.add(n.ID);
          }
        });

        if (freshIds.size > 0) {
          logger.info("New notifications detected", { count: freshIds.size });
          setNewIds((prev) => new Set([...prev, ...freshIds]));
        }

        setNotifications(fetched);
        setTotal(data.total ?? fetched.length);
        logger.info("Notifications loaded", { count: fetched.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("Failed to fetch notifications", { error: msg });
        setError(msg);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.page, params.limit, params.notification_type]
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Background polling
  useEffect(() => {
    const id = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const markViewed = useCallback((id: string) => {
    setNewIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    logger.debug("Notification marked as viewed", { id });
  }, []);

  const markAllViewed = useCallback(() => {
    setNewIds(new Set());
    logger.debug("All notifications marked as viewed");
  }, []);

  return { notifications, loading, error, total, newIds, markViewed, markAllViewed, refetch: fetchData };
}
