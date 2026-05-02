import React from "react";
import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  Tooltip,
  Badge,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import NotificationsIcon from "@mui/icons-material/Notifications";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import { Notification } from "../utils/notifications";

interface Props {
  notification: Notification & { score?: number };
  isNew: boolean;
  onView: (id: string) => void;
}

const TYPE_COLOR: Record<string, "success" | "primary" | "warning"> = {
  Placement: "success",
  Result: "primary",
  Event: "warning",
};

const TYPE_ICON: Record<string, React.ReactElement> = {
  Placement: <WorkIcon fontSize="small" />,
  Result: <EmojiEventsIcon fontSize="small" />,
  Event: <NotificationsIcon fontSize="small" />,
};

export default function NotificationCard({ notification, isNew, onView }: Props) {
  const { ID, Type, Message, Timestamp, score } = notification;
  const color = TYPE_COLOR[Type] ?? "default";
  const icon = TYPE_ICON[Type];

  const handleClick = () => {
    if (isNew) onView(ID);
  };

  return (
    <Card
      onClick={handleClick}
      elevation={isNew ? 4 : 1}
      sx={{
        mb: 1.5,
        borderLeft: 4,
        borderColor: `${color}.main`,
        cursor: isNew ? "pointer" : "default",
        transition: "all 0.2s ease",
        backgroundColor: isNew ? "action.hover" : "background.paper",
        "&:hover": { elevation: 6, transform: "translateY(-1px)" },
      }}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Chip
              icon={icon}
              label={Type}
              color={color}
              size="small"
              variant="filled"
            />
            {isNew && (
              <Tooltip title="New — click to mark as viewed">
                <FiberNewIcon color="error" fontSize="small" />
              </Tooltip>
            )}
            <Typography variant="body1" fontWeight={isNew ? 700 : 400}>
              {Message}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {score !== undefined && (
              <Tooltip title="Priority score">
                <Chip
                  label={`Score: ${score.toFixed(2)}`}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              </Tooltip>
            )}
            <Typography variant="caption" color="text.secondary">
              {Timestamp}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
