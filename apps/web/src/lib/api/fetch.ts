const DEFAULT_API_TIMEOUT_MS = 10_000;

export type ApiFetchInit = RequestInit & {
  /** Set false only for a documented request that may legitimately exceed 10s. */
  timeoutMs?: number | false;
};

export class ApiRequestTimeoutError extends Error {
  constructor() {
    super("The request took too long. Please try again.");
    this.name = "ApiRequestTimeoutError";
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: ApiFetchInit = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_API_TIMEOUT_MS, signal: callerSignal, ...requestInit } = init;
  let requestUrl: URL | undefined;
  const rawUrl =
    typeof input === "string"
      ? input
      : typeof URL !== "undefined" && input instanceof URL
        ? input.href
        : typeof Request !== "undefined" && input instanceof Request
          ? input.url
          : undefined;
  const isRelativeApiPath = rawUrl?.startsWith("/api/") ?? false;
  if (isRelativeApiPath) {
    requestUrl = new URL(rawUrl!, "http://api-fetch.invalid");
  } else if (typeof window !== "undefined" && rawUrl) {
    try {
      requestUrl = new URL(rawUrl);
    } catch {
      // Let fetch report malformed inputs with its normal error.
    }
  }
  const isSameOriginApi =
    isRelativeApiPath ||
    (typeof window !== "undefined" &&
      requestUrl?.origin === window.location.origin &&
      requestUrl.pathname.startsWith("/api/"));
  if (!isSameOriginApi || timeoutMs === false) {
    return fetch(input, { ...requestInit, signal: callerSignal });
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => {
        if (timedOut) reject(new ApiRequestTimeoutError());
      },
      { once: true },
    );
  });

  try {
    return await Promise.race([
      fetch(input, { ...requestInit, signal: controller.signal }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (timedOut) throw new ApiRequestTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
