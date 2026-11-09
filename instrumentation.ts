import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const loggerProvider = posthogProjectToken && posthogHost
  ? new LoggerProvider({
      resource: resourceFromAttributes({ "service.name": "co-zamawiamy" }),
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({
            url: `${posthogHost}/i/v1/logs`,
            headers: {
              Authorization: `Bearer ${posthogProjectToken}`,
              "Content-Type": "application/json",
            },
          }),
        }),
      ],
    })
  : undefined;

if (!loggerProvider && process.env.NODE_ENV !== "production") {
  const missingVariable = posthogProjectToken
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";
  console.warn(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export function register() {}
