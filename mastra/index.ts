
import { Mastra } from '@mastra/core/mastra';
import { codeReviewAgent } from './agents/code-review-agent';

export const mastra = new Mastra({
  agents: { codeReviewAgent },
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true },
  },
});
