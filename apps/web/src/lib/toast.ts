import type { ToastOptions } from "gooey-toast";
import { gooeyToast } from "gooey-toast";

// gooey-toast CSS is loaded lazily (see ToastProvider). Ensure it's ready
// before showing a toast in case a mutation fires before the lazy load lands.
let cssPromise: Promise<unknown> | null = null;
function withCss(fn: () => void) {
  if (!cssPromise) {
    cssPromise = import("gooey-toast/styles.css").catch(() => null);
  }
  void cssPromise.then(() => fn());
}

export const toast = {
  success: (message: string, options?: Omit<ToastOptions, "type">) =>
    withCss(() =>
      gooeyToast.success({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
    ),
  error: (message: string, options?: Omit<ToastOptions, "type">) =>
    withCss(() =>
      gooeyToast.error({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
    ),
  info: (message: string, options?: Omit<ToastOptions, "type">) =>
    withCss(() =>
      gooeyToast.info({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
    ),
  warning: (message: string, options?: Omit<ToastOptions, "type">) =>
    withCss(() =>
      gooeyToast.warning({ title: message, description: message, duration: 4000, timeoutIndicator: true, ...options }),
    ),
};
