import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  /** Extra classes for the close button (e.g. white on a dark header). */
  closeClassName?: string;
  /** Render the built-in top-right close button (defaults to true). */
  showCloseButton?: boolean;
}

/**
 * Lightweight accessible modal rendered via portal to document.body:
 * breaks free from any parent stacking context (e.g. animated cards / transforms),
 * pauses Lenis smooth scroll to keep background page frozen,
 * overlay-click + Escape close, initial focus, role=dialog with aria-modal.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
  className,
  closeClassName,
  showCloseButton = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // 1. Pause Lenis smooth scrolling so wheel events are not stolen by the background page
    const lenis = (window as any).__lenis;
    lenis?.stop();

    // 2. Lock both body and html scroll
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.removeEventListener("keydown", onKeyDown);
      lenis?.start();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-lenis-prevent
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 p-2 sm:p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "relative my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto overscroll-contain rounded-2xl bg-background p-5 shadow-xl outline-none sm:p-6",
          className,
        )}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              closeClassName,
            )}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Dialog;
