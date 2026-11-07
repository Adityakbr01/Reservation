import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeHeroProps {
  title: string;
  subtitle: string;
}

export function HomeHero({ title, subtitle }: HomeHeroProps) {
  return (
    <section className="py-10 sm:py-16 lg:py-20">
      <div className="max-w-2xl space-y-4 sm:space-y-6">
        <p className="text-sm font-medium tracking-wide text-brand">
          Luxury Holiday Cottages · Hamptworth, Wiltshire
        </p>
        <h1 className="text-balance font-display text-4xl font-light leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild className="h-12 rounded-full px-8 text-sm">
            <Link to="/register">
              Get started
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 rounded-full bg-night px-8 text-sm text-white hover:bg-night/90"
          >
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
