import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Water } from "@paper-design/shaders-react";

type AuthMode = "login" | "register" | "forgot" | "reset" | "enquiry";

interface AuthSectionProps {
  mode: AuthMode;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

const ASIDE_COPY: Record<
  AuthMode,
  { title: string; description: string; footnote: string }
> = {
  login: {
    title: "A slower kind of stay.",
    description:
      "Five cottages tucked into the edge of the New Forest — for long weekends, family gatherings and mornings with nowhere to be.",
    footnote: "Cottages · New Forest",
  },
  register: {
    title: "Your next escape starts here.",
    description:
      "Create an account to book directly, keep your details close and return to the quiet whenever you need it.",
    footnote: "Cottages · New Forest",
  },
  forgot: {
    title: "We'll get you back in.",
    description:
      "A secure link, a new password and your cottage plans exactly where you left them.",
    footnote: "Account support · Hamptworth",
  },
  reset: {
    title: "A fresh start.",
    description:
      "Choose a new password and get back to the quiet — your details and bookings stay right here.",
    footnote: "Secure account recovery",
  },
  enquiry: {
    title: "Let's plan your escape.",
    description:
      "A family gathering, a dog-friendly weekend or a date that isn't on the calendar yet — share the shape of your stay and we'll take it from there.",
    footnote: "Replies within one working day",
  },
};

export function AuthSection({
  mode,
  eyebrow,
  title,
  description,
  children,
  footer,
  wide = false,
}: AuthSectionProps) {
  const reducedMotion = usePrefersReducedMotion();
  const aside = ASIDE_COPY[mode];
  const isEnquiry = mode === "enquiry";

  return (
    <div
      className={
        wide
          ? "grid min-h-dvh bg-background lg:grid-cols-[0.85fr_1.15fr]"
          : "grid min-h-dvh bg-background lg:grid-cols-2"
      }
    >
      <section className="order-2 flex min-h-dvh flex-col">
        <header
          className={
            wide
              ? "flex items-center justify-between gap-4 px-5 pt-3 sm:px-8 sm:pt-4 lg:px-10 lg:pt-5 xl:px-12"
              : "flex items-center justify-between gap-4 px-5 pt-5 sm:px-8 lg:px-12 lg:pt-8 xl:px-16"
          }
        >
          <Link
            to="/"
            aria-label="Hamptworth Stays — home"
            className="inline-flex shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <img
              src="/navlogo.webp"
              alt="Hamptworth Stays"
              className={
                wide
                  ? "h-9 w-auto object-contain mix-blend-multiply sm:h-10 lg:h-11"
                  : "h-12 w-auto object-contain mix-blend-multiply lg:h-14"
              }
            />
          </Link>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ArrowLeft
              className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
              aria-hidden
            />
            Back to cottages
          </Link>
        </header>

        <main
          className={
            wide
              ? "flex flex-1 items-center justify-center px-5 py-4 sm:px-8 sm:py-5 lg:px-10 lg:py-6 xl:px-12"
              : "flex flex-1 items-center justify-center px-5 py-7 sm:px-8 lg:px-12 lg:py-10 xl:px-16"
          }
        >
          <div
            className={wide ? "w-full max-w-[680px]" : "w-full max-w-[420px]"}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </p>
            <h1
              className={
                wide
                  ? "mt-2 font-display text-3xl font-normal leading-[1.04] tracking-tight text-foreground sm:text-4xl"
                  : "mt-3 font-display text-4xl font-normal leading-[1.02] tracking-tight text-foreground sm:text-5xl"
              }
            >
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>

            <div className={wide ? "mt-5" : "mt-6"}>{children}</div>

            <div
              className={
                wide
                  ? "mt-4 text-sm text-muted-foreground"
                  : "mt-6 text-sm text-muted-foreground"
              }
            >
              {footer}
            </div>
          </div>
        </main>

        <footer
          className={
            wide
              ? "hidden flex-wrap items-center justify-between gap-3 px-5 pb-4 text-[10px] text-muted-foreground sm:flex sm:px-8 lg:px-10 xl:px-12"
              : "hidden flex-wrap items-center justify-between gap-3 px-5 pb-5 text-[10px] text-muted-foreground sm:flex sm:px-8 lg:px-12 xl:px-16"
          }
        >
          <span>© 2026 Hamptworth Stays</span>
          <span>Home Farm · Hamptworth</span>
        </footer>
      </section>

      <aside className="relative order-1 hidden overflow-hidden bg-[#0b1a12] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:justify-between">
        <Water
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          image="/Bright_Orange_flower.png"
          colorBack={isEnquiry ? "#141a10" : "#0b1a12"}
          colorHighlight="#f7f3e6"
          highlights={0.12}
          layering={0.5}
          edges={0.6}
          waves={0.25}
          caustic={0.12}
          size={1}
          speed={reducedMotion ? 0 : 0.3}
          scale={1.1}
          fit="cover"
          maxPixelCount={2_200_000}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,16,11,0.78)_0%,rgba(7,16,11,0.34)_16%,rgba(7,16,11,0.04)_36%,rgba(7,16,11,0.16)_56%,rgba(7,16,11,0.82)_82%,rgba(7,16,11,0.96)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_22%_96%,rgba(201,162,75,0.26),transparent_58%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(5,12,8,0.55)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,transparent,rgba(201,162,75,0.35),transparent)]"
        />

        <Link
          to={"/"}
          className={
            wide
              ? "relative z-10 flex justify-end p-8 xl:p-10"
              : "relative z-10 flex justify-end p-9 xl:p-12"
          }
        >
          <img
            src="/navlogo.webp"
            alt="Hamptworth Stays"
            className="h-12 w-auto brightness-0 invert opacity-90 drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]"
          />
        </Link>

        <div
          className={
            wide ? "relative z-10 p-8 xl:p-10" : "relative z-10 p-9 xl:p-12"
          }
        >
          <p className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-[#f7f3e6]/65">
            <span aria-hidden className="h-px w-6 bg-[#c9a24b]/80" />
            Home Farm · Hamptworth
          </p>
          <h2
            className={
              wide
                ? "mt-4 max-w-md text-balance font-display text-4xl font-normal leading-[0.98] tracking-tight text-[#f7f3e6] xl:text-5xl"
                : "mt-4 max-w-md text-balance font-display text-5xl font-normal leading-[0.96] tracking-tight text-[#f7f3e6] xl:text-6xl"
            }
          >
            {aside.title}
          </h2>
          <p className="mt-5 max-w-sm text-pretty text-sm leading-relaxed text-[#f7f3e6]/75">
            {aside.description}
          </p>
          <div className="mt-8 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[#f7f3e6]/55">
            <span aria-hidden className="h-px w-8 bg-[#c9a24b]" />
            {aside.footnote}
          </div>
        </div>
      </aside>
    </div>
  );
}
