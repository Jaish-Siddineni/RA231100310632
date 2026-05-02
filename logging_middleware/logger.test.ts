import { createLogger } from "../notification_app_be/logger";

const logger = createLogger("logging-middleware-test", "DEBUG", true);

logger.debug("Logger initialized for test run");
logger.info("Testing all log levels");
logger.info("Processing notification", { id: "abc-123", type: "Placement" });
logger.warn("Rate limit approaching", { requestsRemaining: 10 });
logger.error("Failed to fetch notifications", {
  statusCode: 500,
  url: "http://20.207.122.201/evaluation-service/notifications",
});
logger.debug("Test complete", { totalLevels: 4 });