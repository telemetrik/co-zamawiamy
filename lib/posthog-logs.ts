import { SeverityNumber } from "@opentelemetry/api-logs";
import { loggerProvider } from "@/instrumentation";

const logger = loggerProvider?.getLogger("co-zamawiamy.posthog-export");

export function logPollCreated(optionCount: number) {
  logger?.emit({
    body: "poll_created",
    severityNumber: SeverityNumber.INFO,
    attributes: { option_count: optionCount },
  });
}

export function logVoteRecorded() {
  logger?.emit({
    body: "vote_recorded",
    severityNumber: SeverityNumber.INFO,
  });
}
