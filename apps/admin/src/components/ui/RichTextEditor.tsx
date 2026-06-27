"use client";

import "trumbowyg/dist/ui/trumbowyg.min.css";

import { useEffect, useId, useRef } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import clsx from "clsx";

interface Props {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  rows?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  error,
  required,
  rows = 6,
}: Props) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function init() {
      const jQuery = (await import("jquery")).default;

      (window as any).jQuery = jQuery;
      (window as any).$ = jQuery;

      await Promise.all([
        import("trumbowyg"),
        import("trumbowyg/dist/langs/vi.min.js"),
      ]);

      if (disposed || !textareaRef.current) return;

      const $el = jQuery(textareaRef.current) as any;
      $el.trumbowyg({
        lang: "vi",
        svgPath: "/icons.svg",
        btns: [
          ["undo", "redo"],
          ["formatting"],
          ["strong", "em", "del"],
          ["superscript", "subscript"],
          ["link"],
          ["insertImage"],
          ["justifyLeft", "justifyCenter", "justifyRight"],
          ["unorderedList", "orderedList"],
          ["horizontalRule"],
          ["removeformat"],
          ["fullscreen"],
        ],
        btnsDef: {
          formatting: {
            dropdown: ["p", "h2", "h3", "h4"],
            title: "Định dạng",
            text: "Định dạng",
          },
        },
        placeholder: placeholder ?? "Nhập nội dung...",
        autogrow: true,
        resetCss: true,
      });

      initializedRef.current = true;

      const handler = () => {
        const html: string = $el.trumbowyg("html") ?? "";
        onChange(sanitizeHtml(html));
      };

      $el.on("tbwchange keyup", handler);
    }

    init();

    return () => {
      disposed = true;
      if (initializedRef.current && textareaRef.current) {
        try {
          const $el = (window as any).$(textareaRef.current);
          $el.trumbowyg("destroy");
        } catch {
          /* already disposed */
        }
      }
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;

    const $el = (window as any).$(textareaRef.current!);
    const current: string = $el.trumbowyg("html") ?? "";
    const sanitized = sanitizeHtml(value);
    if (current !== sanitized) {
      $el.trumbowyg("html", sanitized);
    }
  }, [value]);

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div
        className={clsx(
          "trumbowyg-editor-wrapper rounded-lg border transition-colors",
          error
            ? "border-red-400"
            : "border-slate-300 dark:border-slate-600"
        )}
      >
        <textarea
          ref={textareaRef}
          id={id}
          defaultValue={value}
          rows={rows}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
