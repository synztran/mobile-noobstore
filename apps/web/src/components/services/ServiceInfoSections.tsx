"use client";

import { MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { SERVICE_FAQS, SERVICE_GUARANTEES, SERVICE_TIMELINE } from "./serviceInfo";

/**
 * The three "reassurance" sections of the services surface.
 *
 * These were private to `ServiceBookingFlow`, which meant they only rendered
 * for a signed-in visitor and only *after* the whole configurator. They now
 * live here so the landing page can render them publicly, where the decision
 * to trust the store with a keyboard is actually made.
 *
 * Copy and markup are unchanged from the flow (only the eyebrow tracking moved
 * onto the design system's 0.08em); the flow keeps rendering them at the same
 * visual position, now from this shared source.
 */

const sectionReveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

// ─── FAQ Accordion (DaisyUI collapse) ────────────────────────────────────────

export function ServiceFaq() {
  return (
    <motion.section
      {...sectionReveal}
      aria-labelledby="dich-vu-faq"
      className="rounded-2xl bg-surface-container p-4"
    >
      <p
        id="dich-vu-faq"
        className="mb-3 text-xs font-black uppercase tracking-[0.08em] text-primary"
      >
        Câu hỏi thường gặp
      </p>
      <div className="space-y-1.5">
        {SERVICE_FAQS.map((faq, idx) => (
          <details
            key={faq.q}
            className="collapse collapse-arrow rounded-xl bg-surface-container-low"
            open={idx === 0}
          >
            <summary className="collapse-title min-h-0 py-3 text-xs font-bold text-on-surface">
              {faq.q}
            </summary>
            <div className="collapse-content text-xs leading-relaxed text-on-surface-variant">
              <p>{faq.a}</p>
            </div>
          </details>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Trust / Timeline Section ────────────────────────────────────────────────

export function ServiceProcess() {
  return (
    <motion.section
      {...sectionReveal}
      aria-labelledby="dich-vu-quy-trinh"
      className="rounded-2xl bg-surface-container p-4"
    >
      <p
        id="dich-vu-quy-trinh"
        className="mb-4 text-xs font-black uppercase tracking-[0.08em] text-primary"
      >
        Quy trình & cam kết
      </p>

      <ul className="timeline timeline-vertical timeline-compact">
        {SERVICE_TIMELINE.map((step, idx) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 * idx, duration: 0.3 }}
          >
            {idx > 0 ? <hr /> : null}
            <div className="timeline-middle text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="timeline-end timeline-box my-1 border-outline-variant/20 bg-surface-container-lowest">
              <p className="text-xs font-bold text-on-surface">{step.title}</p>
              <p className="text-xs leading-tight text-on-surface-variant">
                {step.desc}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {SERVICE_GUARANTEES.map(({ icon: GuaranteeIcon, label }) => (
          <span
            key={label}
            className="badge badge-outline gap-1 border-primary/25 py-2.5 text-xs font-semibold text-primary"
          >
            <GuaranteeIcon className="h-3 w-3" />
            {label}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Contact Card ────────────────────────────────────────────────────────────

export function ServiceContact() {
  return (
    <motion.section
      {...sectionReveal}
      aria-labelledby="dich-vu-lien-he"
      className="rounded-2xl bg-surface-container p-4 shadow-ambient-sm"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <p id="dich-vu-lien-he" className="text-sm font-black text-on-surface">
            Cần tư vấn?
          </p>
          <p className="text-xs text-on-surface-variant">
            Đội ngũ Noobstore sẵn sàng hỗ trợ bạn
          </p>
        </div>
      </div>
      <a
        href={process.env.NEXT_PUBLIC_FACEBOOK_URL}
        target="_blank"
        rel="noreferrer"
        className="btn btn-primary btn-block btn-sm rounded-full text-xs font-bold tracking-[0.08em] uppercase"
      >
        Chat Zalo / Facebook
      </a>
    </motion.section>
  );
}
