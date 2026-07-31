import type { ClassificationResult } from "./classification";

export interface TicketForSlack {
  ticket_id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
}

const URGENCY_EMOJI: Record<ClassificationResult["urgency"], string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

export interface SlackMessage {
  text: string;
  blocks: Array<Record<string, unknown>>;
}

export function buildSlackMessage(ticket: TicketForSlack, enrichment: ClassificationResult): SlackMessage {
  const emoji = URGENCY_EMOJI[enrichment.urgency];
  const headline = `${emoji} New ${enrichment.urgency} ticket: ${ticket.subject}`;

  return {
    text: headline,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${headline}\n*From:* ${ticket.customer_name} <${ticket.customer_email}>\n*Category:* ${enrichment.category} · *Sentiment:* ${enrichment.sentiment}\n*Summary:* ${enrichment.summary}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Ticket ID: ${ticket.ticket_id}`,
          },
        ],
      },
    ],
  };
}

export async function sendSlackMessage(webhookUrl: string, message: SlackMessage): Promise<string> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Slack webhook responded with ${response.status}: ${responseText}`);
  }

  return responseText;
}
