import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
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
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import Link from "next/link";
import { useNotifications } from "../hooks/useNotifications";
import NotificationCard from "../components/NotificationCard";
import { NotificationType } from "../utils/notifications";
import { createLogger } from "../utils/logger";

const logger = createLogger("AllNotificationsPage");

const PAGE_SIZE = 10;

export default function AllNotificationsPage() {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<NotificationType | "">("");

  logger.debug("Rendering AllNotificationsPage", { page, filterType });

  const { notifications, loading, error, total, newIds, markViewed, markAllViewed, refetch } =
    useNotifications({
      page,
      limit: PAGE_SIZE,
      notification_type: filterType,
    });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleFilterChange = (val: NotificationType | "") => {
    logger.info("Filter changed", { type: val });
    setFilterType(val);
    setPage(1);
  };

  return (
    <>
      {/* App Bar */}
      <AppBar position="sticky" color="primary" elevation={2}>
        <Toolbar>
          <NotificationsIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Campus Notifications
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Badge badgeContent={newIds.size} color="error">
              <Button
                component={Link}
                href="/"
                color="inherit"
                variant="contained"
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
              >
                All
              </Button>
            </Badge>
            <Button
              component={Link}
              href="/priority"
              color="inherit"
              variant="outlined"
              size="small"
              startIcon={<StarIcon />}
            >
              Priority Inbox
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4">All Notifications</Typography>
            <Typography variant="body2" color="text.secondary">
              {total > 0 ? `${total} total notifications` : "Loading..."}
              {newIds.size > 0 && (
                <Chip
                  label={`${newIds.size} new`}
                  color="error"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {newIds.size > 0 && (
              <Tooltip title="Mark all as viewed">
                <IconButton onClick={markAllViewed} color="primary">
                  <DoneAllIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()} color="primary" disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Filter */}
        <Box mb={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={filterType}
              label="Filter by Type"
              onChange={(e) => handleFilterChange(e.target.value as NotificationType | "")}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="Placement">🏢 Placement</MenuItem>
              <MenuItem value="Result">📊 Result</MenuItem>
              <MenuItem value="Event">🎉 Event</MenuItem>
            </Select>
          </FormControl>
          {filterType && (
            <Button size="small" onClick={() => handleFilterChange("")} variant="outlined">
              Clear filter
            </Button>
          )}
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {/* Notification list */}
        {!loading && notifications.length === 0 && !error && (
          <Alert severity="info">No notifications found.</Alert>
        )}

        {!loading &&
          notifications.map((n) => (
            <NotificationCard
              key={n.ID}
              notification={n}
              isNew={newIds.has(n.ID)}
              onView={markViewed}
            />
          ))}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={4}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => {
                logger.info("Page changed", { page: v });
                setPage(v);
              }}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Container>
    </>
  );
}
