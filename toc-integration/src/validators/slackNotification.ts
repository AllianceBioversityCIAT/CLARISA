import axios from "axios";
import { env } from "process";

function truncateWords(text: string, maxWords = 50) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  return words.length > maxWords
    ? words.slice(0, maxWords).join(" ") + "…"
    : text;
}

function errorToString(err: unknown) {
  if (!err) return "";
  if (err instanceof Error) return err.stack || err.message || String(err);
  try {
    return typeof err === "string" ? err : JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function sendSlackNotification(
  emoji: string,
  initOfficialCode: string,
  message: string,
  err?: unknown
) {
  const slackWebhookUrl = env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) return;

  const errorPart = err
    ? `\n*Error:* ${truncateWords(errorToString(err), 100)}`
    : "";
  const text = `${emoji} :toc: *${env.TOC_ENV}: (${initOfficialCode})* ${message}. ${errorPart}`;

  axios
    .post(slackWebhookUrl, { text })
    .then(() => console.log("Notification sent to Slack successfully"))
    .catch((error) =>
      console.error(
        "A error occurred while trying to sent notification to Slack",
        error
      )
    );
}
