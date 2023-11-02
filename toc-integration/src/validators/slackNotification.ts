import axios from "axios";
import { env } from "process";

export function sendSlackNotification(emoji: string, initOfficialCode: string, message: string) {
  const slackWebhookUrl = env.SLACK_WEBHOOK_URL;

  axios
    .post(slackWebhookUrl, {
      text: `${emoji} :toc: ${env.TOC_ENV}: (${initOfficialCode}) *${message}.*`,
    })
    .then((response) => {
      console.log("Notification sent to Slack successfully");
    })
    .catch((error) => {
      console.error(
        "A error occurred while trying to sent notification to Slack",
        error
      );
    });
}
