import type { ToastOptions } from "gooey-toast";
import { gooeyToast } from "gooey-toast";

export const toast = {
	success: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.success({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
	error: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.error({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
	info: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.info({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
	warning: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.warning({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
};
