function getBaseUrl(): string {
  return process.env.CHANGEDETECTION_BASE_URL ?? "http://127.0.0.1:5000";
}

function getApiKey(): string {
  return process.env.CHANGEDETECTION_API_KEY ?? "";
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = getApiKey();
  if (key) headers["x-api-key"] = key;
  return headers;
}

function apiUrl(path: string): string {
  return `${getBaseUrl()}/api/v1${path}`;
}

type ChangeDetectionWatch = {
  uuid: string;
  url: string;
  title: string | null;
  paused: boolean;
  last_checked: number | null;
  last_changed: number | null;
  last_error: string | boolean | null;
  page_title: string | null;
  history_n: number;
};

type CreateWatchOptions = {
  url: string;
  title?: string;
  css_selector?: string;
  notification_urls?: string[];
  notification_body?: string;
  time_between_check?: {
    hours?: number;
    minutes?: number;
    days?: number;
  };
  paused?: boolean;
  extract_text?: string[];
  include_filters?: string[];
};

async function findWatchByUrl(url: string): Promise<string | null> {
  const res = await fetch(apiUrl("/watch"), {
    headers: apiHeaders(),
  });

  if (!res.ok) return null;

  const watches: Record<string, ChangeDetectionWatch> = await res.json();

  for (const [uuid, watch] of Object.entries(watches)) {
    if (watch.url === url) return uuid;
  }

  return null;
}

function formatWebhookUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("json://") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `json://${trimmed.replace(/^\/+/, "")}`;
}

export async function createWatch(
  sourceId: string,
  options: CreateWatchOptions
): Promise<string> {
  const webhookRaw = process.env.CHANGEDETECTION_WEBHOOK_URL ?? "";
  const notificationUrls: string[] = [];
  const formatted = formatWebhookUrl(webhookRaw);
  if (formatted) {
    notificationUrls.push(formatted);
  }

  const body: Record<string, unknown> = {
    url: options.url,
    title: options.title || `NoobStore Source: ${sourceId}`,
    notification_urls: notificationUrls,
    notification_body: JSON.stringify({
      watch_uuid: "{{uuid}}",
      watch_url: "{{watch_url}}",
      page_title: "{{page_title}}",
      source_id: sourceId,
    }),
    notification_format: "text",
    time_between_check: options.time_between_check ?? { hours: 6 },
  };

  if (options.css_selector) {
    body.include_filters = [options.css_selector];
  }

  if (options.paused) {
    body.paused = true;
  }

  const res = await fetch(apiUrl("/watch"), {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to create watch: ${res.status} ${text}`);
  }

  const location = res.headers.get("location") || res.headers.get("Location");
  if (location) {
    const uuid = location.split("/").pop();
    if (uuid && uuid.length === 36) return uuid;
  }

  const uuid = await findWatchByUrl(options.url);
  if (uuid) return uuid;

  const text = await res.text().catch(() => "");
  if (text && text.length === 36 && text.includes("-")) {
    return text;
  }

  throw new Error(
    "Watch created but could not determine UUID. Check changedetection.io admin."
  );
}

export async function updateWatch(
  watchId: string,
  options: Partial<CreateWatchOptions>
): Promise<void> {
  const body: Record<string, unknown> = {};

  if (options.url) body.url = options.url;
  if (options.title) body.title = options.title;
  if (options.css_selector) body.include_filters = [options.css_selector];
  if (options.paused !== undefined) body.paused = options.paused;
  if (options.notification_urls) body.notification_urls = options.notification_urls;
  if (options.notification_body) body.notification_body = options.notification_body;
  if (options.time_between_check) body.time_between_check = options.time_between_check;

  const res = await fetch(apiUrl(`/watch/${watchId}`), {
    method: "PUT",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to update watch: ${res.status} ${text}`);
  }
}

export async function deleteWatch(watchId: string): Promise<void> {
  const res = await fetch(apiUrl(`/watch/${watchId}`), {
    method: "DELETE",
    headers: apiHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to delete watch: ${res.status} ${text}`);
  }
}

export async function recheckWatch(watchId: string): Promise<void> {
  const res = await fetch(apiUrl(`/watch/${watchId}?recheck=1`), {
    method: "GET",
    headers: apiHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Failed to recheck watch: ${res.status} ${text}`);
  }
}

export async function getWatch(
  watchId: string
): Promise<ChangeDetectionWatch | null> {
  const res = await fetch(apiUrl(`/watch/${watchId}`), {
    headers: apiHeaders(),
  });

  if (!res.ok) return null;

  return res.json();
}

export async function getLatestSnapshot(
  watchId: string,
  includeHtml = false
): Promise<string | null> {
  const query = includeHtml ? "?html=1" : "";
  const res = await fetch(
    apiUrl(`/watch/${watchId}/history/latest${query}`),
    { headers: apiHeaders() }
  );

  if (!res.ok) return null;

  return res.text();
}

export async function getWatchHistory(
  watchId: string
): Promise<Record<string, string> | null> {
  const res = await fetch(apiUrl(`/watch/${watchId}/history`), {
    headers: apiHeaders(),
  });

  if (!res.ok) return null;

  return res.json();
}

export async function pollLatestSnapshot(
  watchId: string,
  maxAttempts = 10,
  delayMs = 1500
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const snapshot = await getLatestSnapshot(watchId, false);
    if (snapshot && snapshot.trim().length > 0) {
      return snapshot;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}
