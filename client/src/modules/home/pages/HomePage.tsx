import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RoomTypeCard,
  SearchForm,
  defaultSearchDates,
  useAvailabilitySearch,
} from "@/modules/availability";
import type { AvailabilitySearchParams } from "@/modules/availability";

export function HomePage() {
  const location = useLocation();
  const restored = (location.state as { search?: AvailabilitySearchParams } | null)?.search ?? null;
  const [search, setSearch] = useState<AvailabilitySearchParams | null>(restored);
  const { data, isFetching, isError, refetch } = useAvailabilitySearch(search);
  const dates = defaultSearchDates();
  const initial: AvailabilitySearchParams = {
    ...dates,
    adults: 2,
    children: 0,
    rooms: 1,
  };
  const results = data?.results ?? [];

  return (
    <div className="space-y-8 py-8 sm:py-12">
      <section className="max-w-2xl space-y-4">
        <p className="text-sm font-medium tracking-wide text-brand">
          Single property · Best rate here
        </p>
        <h1 className="text-balance font-display text-4xl font-light leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
          Find your stay
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Pick your dates and guests to see live availability and rates.
        </p>
      </section>

      <Card className="shadow-card">
        <CardContent className="p-6">
          <SearchForm initial={initial} isPending={isFetching} onSearch={setSearch} />
        </CardContent>
      </Card>

      {!search ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-medium">Where to, and when?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Search above to see available rooms and rates for your stay.
            </p>
          </CardContent>
        </Card>
      ) : isFetching ? (
        <div className="space-y-4" aria-busy="true" aria-label="Searching availability">
          {[0, 1].map((row) => (
            <Skeleton key={row} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Search failed</CardTitle>
            <CardDescription>Check your dates and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="h-11 w-full rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-medium">Nothing available for these dates</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try different dates, fewer guests, or fewer rooms.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {results.length} room type{results.length === 1 ? "" : "s"} · {data.search.nights}{" "}
            night{data.search.nights === 1 ? "" : "s"} · {data.search.adults + data.search.children}{" "}
            guest{data.search.adults + data.search.children === 1 ? "" : "s"}
          </p>
          {results.map((item) => (
            <RoomTypeCard key={item.roomType.id} item={item} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
