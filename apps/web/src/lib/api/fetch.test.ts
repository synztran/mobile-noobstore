import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestTimeoutError, apiFetch } from "./fetch";

describe("apiFetch", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aborts after the default 10-second timeout and identifies it", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = apiFetch("/api/example");
    const assertion = expect(request).rejects.toBeInstanceOf(ApiRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("preserves caller cancellation without labeling it a timeout", async () => {
    const caller = new AbortController();
    vi.stubGlobal("fetch", (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    );

    const request = apiFetch("/api/example", { signal: caller.signal });
    caller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  it("supports explicit timeout opt-out", async () => {
    const response = new Response("ok");
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("/api/upload", { timeoutMs: false })).resolves.toBe(response);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeUndefined();
  });

  it("does not time out data URLs or external requests", async () => {
    vi.useFakeTimers();
    const response = new Response("ok");
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch("https://example.com/api/example")).resolves.toBe(response);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeUndefined();
  });

  it("times out relative same-origin API paths", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const absoluteRequest = apiFetch("/api/example");
    const absoluteAssertion = expect(absoluteRequest).rejects.toBeInstanceOf(ApiRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(10_000);
    await absoluteAssertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
