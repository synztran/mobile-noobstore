"use client";

import { toast } from "@/lib/toast";
import { useCallback, useMemo, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	const rawData = atob(base64);
	const output = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i += 1) {
		output[i] = rawData.charCodeAt(i);
	}
	return output;
}

export function usePushNotifications() {
	const [loading, setLoading] = useState(false);
	const [permission, setPermission] = useState<NotificationPermission>(
		typeof window !== "undefined" && "Notification" in window
			? Notification.permission
			: "default",
	);

	const isSupported = useMemo(() => {
		if (typeof window === "undefined") return false;
		return (
			"serviceWorker" in navigator &&
			"PushManager" in window &&
			"Notification" in window
		);
	}, []);

	const subscribe = useCallback(async () => {
		if (!isSupported) {
			toast.error("Thiết bị không hỗ trợ Web Push");
			return false;
		}

		const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
		if (!vapidPublicKey) {
			toast.error("Thiếu cấu hình VAPID public key");
			return false;
		}

		setLoading(true);
		try {
			const perm = await Notification.requestPermission();
			setPermission(perm);

			if (perm !== "granted") {
				toast.error("Bạn chưa cấp quyền nhận thông báo");
				return false;
			}

			const registration = await navigator.serviceWorker.register(
				"/sw.js",
				{
					scope: "/",
				},
			);

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
			});

			const json = subscription.toJSON();
			const endpoint = json.endpoint;
			const p256dh = json.keys?.p256dh;
			const auth = json.keys?.auth;

			if (!endpoint || !p256dh || !auth) {
				toast.error("Không thể lấy thông tin push subscription");
				return false;
			}

			const response = await fetch("/api/notifications/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					endpoint,
					p256dh,
					auth,
					userAgent: navigator.userAgent,
					devicePlatform: navigator.platform || "web",
				}),
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(
					payload?.error ?? "Đăng ký nhận thông báo thất bại",
				);
			}

			toast.success("Đã bật thông báo thành công");
			return true;
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Bật thông báo thất bại",
			);
			return false;
		} finally {
			setLoading(false);
		}
	}, [isSupported]);

	const unsubscribe = useCallback(async () => {
		if (!isSupported) return false;
		setLoading(true);
		try {
			const registration =
				await navigator.serviceWorker.getRegistration("/");
			const sub = await registration?.pushManager.getSubscription();
			if (!sub) return true;

			await fetch("/api/notifications/unsubscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ endpoint: sub.endpoint }),
			});
			await sub.unsubscribe();
			toast.success("Đã tắt thông báo");
			return true;
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Không thể tắt thông báo",
			);
			return false;
		} finally {
			setLoading(false);
		}
	}, [isSupported]);

	return {
		isSupported,
		permission,
		loading,
		subscribe,
		unsubscribe,
	};
}
