import type { ToastOptions } from "gooey-toast";
import { gooeyToast } from "gooey-toast";

export const toast = {
	success: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.success({ title: message, ...options }),
	error: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.error({ title: message, ...options }),
	info: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.info({ title: message, ...options }),
	warning: (message: string, options?: Omit<ToastOptions, "type">) =>
		gooeyToast.warning({ title: message, ...options }),
};
