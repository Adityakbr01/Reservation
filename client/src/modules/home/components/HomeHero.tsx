import { Button } from "@/components/ui/button";

interface HomeHeroProps {
  title: string;
  subtitle: string;
}

export function HomeHero({ title, subtitle }: HomeHeroProps) {
  return (
    <section className="space-y-2 py-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{subtitle}</p>
      <div className="flex gap-2 pt-2">
        <Button>Get started</Button>
        <Button variant="outline">Learn more</Button>
      </div>
    </section>
  );
}
