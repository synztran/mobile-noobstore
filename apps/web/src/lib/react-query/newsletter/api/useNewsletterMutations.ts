import { useMutation } from "@tanstack/react-query";

export function useNewsletterSubscribe() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Đăng ký thất bại");
      return data;
    },
  });
}

export function useReleaseSubscribe() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/release-subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Đăng ký thất bại");
      return data;
    },
  });
}
