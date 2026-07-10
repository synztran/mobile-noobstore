import type { ToastOptions } from "gooey-toast";
import { gooeyToast } from "gooey-toast";

export const toast = {
	success: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.success({ title: message, description: message, ...options }),
	error: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.error({ title: message, description: message, ...options }),
	info: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.info({ title: message, description: message, ...options }),
	warning: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.warning({ title: message, description: message, ...options }),
};
