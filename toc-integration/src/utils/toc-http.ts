import axios from "axios";
import { TocSyncError } from "../types/toc-sync-error";

/** The ToC public API guide recommends allowing >= 60 s for the largest ToCs. */
export const TOC_HTTP_TIMEOUT_MS = 60000;

/**
 * GET a ToC API url and return the JSON body. Any failure is converted into a
 * TocSyncError so the caller can decide status code and Slack behaviour.
 */
export async function fetchTocJson<T = any>(
  url: string,
  timeoutMs: number = TOC_HTTP_TIMEOUT_MS
): Promise<T> {
  try {
    const response = await axios.get<T>(url, { timeout: timeoutMs });
    return response.data;
  } catch (err) {
    throw classifyTocHttpError(err, url);
  }
}

export function classifyTocHttpError(err: any, url: string): Error {
  if (err instanceof TocSyncError) return err;

  const isAxios = !!err && (err.isAxiosError === true || !!err.response || !!err.code);
  if (!isAxios) return err instanceof Error ? err : new Error(String(err));

  const status: number | undefined = err.response?.status;
  const body = err.response?.data;

  if (status === 404) {
    // Normal answer for "this ToC has no published version in that phase".
    return new TocSyncError({
      statusCode: 404,
      code: "TOC_NOT_FOUND",
      message:
        typeof body?.message === "string"
          ? `ToC API: ${body.message}`
          : "ToC not found or not published in the requested phase",
      notifySlack: false,
      details: { url, upstreamStatus: status },
    });
  }

  if (err.code === "ECONNABORTED" || /timeout/i.test(String(err.message))) {
    return new TocSyncError({
      statusCode: 504,
      code: "TOC_TIMEOUT",
      message: `ToC API did not answer within the timeout`,
      notifySlack: true,
      details: { url },
    });
  }

  if (typeof status === "number") {
    return new TocSyncError({
      statusCode: 502,
      code: "TOC_HTTP_ERROR",
      message: `ToC API answered HTTP ${status}`,
      notifySlack: true,
      details: { url, upstreamStatus: status, upstreamBody: body },
    });
  }

  return new TocSyncError({
    statusCode: 502,
    code: "TOC_NETWORK",
    message: `Could not reach the ToC API (${err.code ?? err.message})`,
    notifySlack: true,
    details: { url },
  });
}
