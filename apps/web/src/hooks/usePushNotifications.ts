"use client";

import { apiFetch } from "@/lib/api/fetch";
import { toast } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	const rawData = atob(base64);
	const output = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i += 1) {
		output[i] = rawData.charCodeAt(i);
	}
	return new Uint8Array(output.buffer.slice(0));
}

export function usePushNotifications() {
	const [loading, setLoading] = useState(false);
	const [permission, setPermission] = useState<NotificationPermission>("default");
	const [isSupported, setIsSupported] = useState(false);

	useEffect(() => {
		if ("Notification" in window) {
			setPermission(Notification.permission);
		}
		setIsSupported(
			"serviceWorker" in navigator &&
				"PushManager" in window &&
				"Notification" in window,
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

			let registration: ServiceWorkerRegistration;
			try {
				registration = await navigator.serviceWorker.register("/sw.js", {
					scope: "/",
				});
			} catch (swErr) {
				throw new Error(
					"Không thể đăng ký Service Worker. Vui lòng kiểm tra kết nối SSL và thử lại.",
				);
			}

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

			const response = await apiFetch("/api/notifications/subscribe", {
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

			await apiFetch("/api/notifications/unsubscribe", {
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
