import React, { useState, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Stack,
  AppBar,
  Toolbar,
  Badge,
  IconButton,
  Tooltip,
  Slider,
  Paper,
  Divider,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import Link from "next/link";
import { useNotifications } from "../hooks/useNotifications";
import NotificationCard from "../components/NotificationCard";
import { getTopN, NotificationType, ScoredNotification } from "../utils/notifications";
import { createLogger } from "../utils/logger";

const logger = createLogger("PriorityInboxPage");

const FETCH_LIMIT = 10; // fetch a large batch, compute top-n client side

export default function PriorityInboxPage() {
  const [topN, setTopN] = useState(10);
  const [filterType, setFilterType] = useState<NotificationType | "">("");

  logger.debug("Rendering PriorityInboxPage", { topN, filterType });

  const { notifications, loading, error, newIds, markViewed, markAllViewed, refetch } =
    useNotifications({ limit: FETCH_LIMIT });

  const prioritized = useMemo<ScoredNotification[]>(() => {
    logger.info("Computing priority notifications", {
      total: notifications.length,
      topN,
      filterType,
    });
    let filtered = notifications;
    if (filterType) {
      filtered = notifications.filter((n) => n.Type === filterType);
    }
    return getTopN(filtered, topN);
  }, [notifications, topN, filterType]);

  return (
    <>
      <AppBar position="sticky" color="secondary" elevation={2}>
        <Toolbar>
          <StarIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Priority Inbox
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              component={Link}
              href="/"
              color="inherit"
              variant="outlined"
              size="small"
              startIcon={<NotificationsIcon />}
            >
              All
            </Button>
            <Badge badgeContent={newIds.size} color="error">
              <Button
                component={Link}
                href="/priority"
                color="inherit"
                variant="contained"
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
              >
                Priority
              </Button>
            </Badge>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4">🏆 Priority Inbox</Typography>
            <Typography variant="body2" color="text.secondary">
              Top notifications ranked by type weight × recency
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {newIds.size > 0 && (
              <Tooltip title="Mark all viewed">
                <IconButton onClick={markAllViewed} color="secondary">
                  <DoneAllIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()} color="secondary" disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Controls */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            {/* Top-N slider */}
            <Box>
              <Typography variant="body2" gutterBottom fontWeight={600}>
                Show top <Chip label={topN} size="small" color="secondary" /> notifications
              </Typography>
              <Slider
                value={topN}
                min={5}
                max={30}
                step={5}
                marks={[
                  { value: 5, label: "5" },
                  { value: 10, label: "10" },
                  { value: 15, label: "15" },
                  { value: 20, label: "20" },
                  { value: 25, label: "25" },
                  { value: 30, label: "30" },
                ]}
                valueLabelDisplay="auto"
                onChange={(_, v) => {
                  logger.info("Top-N changed", { topN: v });
                  setTopN(v as number);
                }}
                color="secondary"
              />
            </Box>

            <Divider />

            {/* Type filter */}
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Filter by Type</InputLabel>
                <Select
                  value={filterType}
                  label="Filter by Type"
                  onChange={(e) => {
                    logger.info("Priority filter changed", { type: e.target.value });
                    setFilterType(e.target.value as NotificationType | "");
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="Placement">🏢 Placement</MenuItem>
                  <MenuItem value="Result">📊 Result</MenuItem>
                  <MenuItem value="Event">🎉 Event</MenuItem>
                </Select>
              </FormControl>
              {filterType && (
                <Button size="small" onClick={() => setFilterType("")} variant="outlined" color="secondary">
                  Clear filter
                </Button>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Priority legend */}
        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            Priority weights:
          </Typography>
          <Chip label="🏢 Placement = 3×" size="small" color="success" variant="outlined" />
          <Chip label="📊 Result = 2×" size="small" color="primary" variant="outlined" />
          <Chip label="🎉 Event = 1×" size="small" color="warning" variant="outlined" />
        </Box>

        {/* Error */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {/* List */}
        {!loading && prioritized.length === 0 && !error && (
          <Alert severity="info">No notifications match the current filter.</Alert>
        )}

        {!loading &&
          prioritized.map((n) => (
            <NotificationCard
              key={n.ID}
              notification={n}
              isNew={newIds.has(n.ID)}
              onView={markViewed}
            />
          ))}

        {!loading && prioritized.length > 0 && (
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={2}>
            Showing {prioritized.length} of {notifications.length} notifications. Click a notification to mark as viewed.
          </Typography>
        )}
      </Container>
    </>
  );
}
