"use client";

import { useAuth } from "@/modules/user/client/AuthProvider";
import { CalendarCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * A persistent "start booking" action for the signed-out page.
 *
 * `/services` is a long page for someone without a session: rail, gate, FAQ,
 * process, guarantees, contact, Middleman. The only ways to reach the gate were
 * the hero link, a rail row, or scrolling back up — so a visitor reading the
 * FAQ had no way down to booking without hunting. This keeps one behind them,
 * and hides while the gate itself is on screen, since the gate *is* the action
 * (duplicating it there would be two calls to the same tap).
 *
 * It deliberately does **not** render for a signed-in visitor: the flow already
 * carries a fixed summary bar with the running total and the submit button, and
 * a second floating bar stacked above it is clutter rather than help.
 */
export function BookingCta() {
  const { user, loading } = useAuth();
  const [pastGate, setPastGate] = useState(false);

  useEffect(() => {
    const gate = document.getElementById("dat-lich");
    if (!gate) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPastGate(!entry.isIntersecting),
      // Only counts as "reached" once it is properly in view, not merely
      // peeking at the bottom edge.
      { rootMargin: "-25% 0px 0px 0px" }
    );
    observer.observe(gate);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {!loading && !user && pastGate ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[55] mx-auto w-auto max-w-sm"
        >
          <Link
            href="#dat-lich"
            className="btn btn-primary btn-block rounded-full text-xs font-bold uppercase tracking-[0.08em] shadow-float"
          >
            <CalendarCheck className="h-4 w-4" />
            Bắt đầu đặt lịch
          </Link>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
