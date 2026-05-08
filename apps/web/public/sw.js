self.addEventListener("push", (event) => {
	if (!event.data) {
		return;
	}

	let payload = {};
	try {
		payload = event.data.json();
	} catch {
		payload = { title: "NoobStore", body: event.data.text() };
	}

	const title = payload.title || "NoobStore";
	const options = {
		body: payload.body || "Bạn có thông báo mới",
		icon: payload.icon || "/icon-192.png",
		badge: payload.badge || "/icon-192.png",
		data: {
			deepLink: payload.deepLink || "/profile/notifications",
			notificationId: payload.notificationId || null,
		},
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const deepLink =
		(event.notification.data && event.notification.data.deepLink) ||
		"/profile/notifications";

	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((list) => {
				for (const client of list) {
					if ("focus" in client) {
						client.navigate(deepLink);
						return client.focus();
					}
				}
				return clients.openWindow(deepLink);
			}),
	);
});
