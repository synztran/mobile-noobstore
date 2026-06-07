"use client";

import { useState } from "react";

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [target, setTarget] = useState<"all" | "single" | "users">("all");
  const [userId, setUserId] = useState("");
  const [userIdsCsv, setUserIdsCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const payload: any = {
      title,
      body,
      deepLink: deepLink || undefined,
      target,
    };
    if (target === "single") payload.userId = userId;
    if (target === "users")
      payload.userIds = userIdsCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Send Push Notification</h1>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            className="input input-bordered w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Body</label>
          <textarea
            className="textarea textarea-bordered w-full"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Deep link (optional)
          </label>
          <input
            className="input input-bordered w-full"
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="/profile/notifications"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Target</label>
          <select
            className="select select-bordered w-full"
            value={target}
            onChange={(e) => setTarget(e.target.value as any)}
          >
            <option value="all">All subscribers</option>
            <option value="single">Single user</option>
            <option value="users">Multiple users (CSV)</option>
          </select>
        </div>

        {target === "single" && (
          <div>
            <label className="block text-sm font-medium">User ID</label>
            <input
              className="input input-bordered w-full"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
        )}

        {target === "users" && (
          <div>
            <label className="block text-sm font-medium">
              User IDs (comma separated)
            </label>
            <input
              className="input input-bordered w-full"
              value={userIdsCsv}
              onChange={(e) => setUserIdsCsv(e.target.value)}
              placeholder="id1,id2,id3"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setTitle("");
              setBody("");
              setDeepLink("");
              setUserId("");
              setUserIdsCsv("");
              setResult(null);
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 rounded bg-base-200 p-4">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
