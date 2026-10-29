"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Snack = { text: string; action?: { label: string; href: string } };

/** A short message at the bottom of the screen that hides itself. Returns the element and a show function. */
export function useSnackbar(ms = 5000) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback(
    (text: string, action?: Snack["action"]) => {
      clearTimeout(timer.current);
      setSnack({ text, action });
      timer.current = setTimeout(() => setSnack(null), ms);
    },
    [ms],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  const node = (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 print:hidden"
    >
      {snack && (
        <div className="fade-up pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]">
          <span className="leading-snug">{snack.text}</span>
          {snack.action && (
            <a
              href={snack.action.href}
              className="shrink-0 font-medium text-[#8fc2ff] hover:text-[var(--cyan)]"
            >
              {snack.action.label}
            </a>
          )}
          <button
            aria-label="Dismiss"
            className="shrink-0 muted hover:text-white"
            onClick={() => setSnack(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
  return { node, show };
}
