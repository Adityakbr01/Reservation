import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/common/PaginationControls";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { useCottages } from "@/modules/cottages";
import { BlockForm } from "../components/BlockForm";
import { InventoryStatus } from "../components/InventoryStatus";
import { AdminCalendar } from "../components/AdminCalendar";
import { useBlocks, useDeleteBlock } from "../hooks/use-availability";

import { formatDisplayDate, countNights, addDaysKey } from "@/lib/date";

export function AvailabilityPage() {
  const [cottageId, setCottageId] = useState("all");
  const [page, setPage] = useState(1);
  const [blockStartDate, setBlockStartDate] = useState<string>("");
  const [blockEndDate, setBlockEndDate] = useState<string>("");
  const [blockCottageId, setBlockCottageId] = useState<string>("");
  const { data: cottagesData } = useCottages({ page: 1, limit: 100 });
  const cottages = useMemo(() => cottagesData?.items ?? [], [cottagesData]);

  const cottageLabel = useMemo(() => {
    const map = new Map(cottages.map((c) => [c.id, c.name] as const));
    return (id: string) => map.get(id) ?? "Cottage";
  }, [cottages]);

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(cottageId !== "all" ? { roomTypeId: cottageId, cottageId } : {}),
    }),
    [page, cottageId],
  );
  const { data, isPending, isError, refetch } = useBlocks(filters);
  const { mutate: removeBlock, isPending: isDeleting } = useDeleteBlock();
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Availability & Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} manual blocks` : "Block cottage dates out of inventory"}
        </p>
      </div>

      <InventoryStatus />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">New date block</CardTitle>
            <CardDescription>End date is exclusive — checkout day stays free</CardDescription>
          </CardHeader>
          <CardContent>
            <BlockForm
              cottages={cottages}
              cottageId={blockCottageId}
              startDate={blockStartDate}
              endDate={blockEndDate}
              onDateChange={(start, end) => {
                setBlockStartDate(start);
                setBlockEndDate(end);
              }}
              onCottageChange={(id) => setBlockCottageId(id)}
            />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label>Filter by Cottage</Label>
              <Select
                value={cottageId}
                onValueChange={(value) => {
                  setCottageId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-56" aria-label="Filter blocks by cottage">
                  <SelectValue placeholder="All cottages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cottages</SelectItem>
                  {cottages.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading blocks">
              {[0, 1].map((row) => (
                <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load blocks.</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="font-medium">No blocks</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every cottage is available unless blocked or booked.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cottage</TableHead>
                    <TableHead>Nights blocked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>
                        <div className="font-medium">{cottageLabel(block.roomTypeId || block.roomId || "")}</div>
                        {block.reason && (
                          <div className="text-xs text-muted-foreground">{block.reason}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatDisplayDate(block.startDate)} → {formatDisplayDate(block.endDate)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {countNights(block.startDate, block.endDate)} night{countNights(block.startDate, block.endDate) === 1 ? "" : "s"} · checkout {formatDisplayDate(block.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ConfirmButton
                          title="Remove this block?"
                          description="These dates become bookable again immediately."
                          confirmLabel="Remove"
                          triggerLabel="Remove"
                          pending={isDeleting}
                          onConfirm={() => removeBlock(block.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls page={data?.page ?? 1} totalPages={totalPages} onPage={setPage} />
            </>
          )}
        </div>
      </div>

      <AdminCalendar
        onDateSelect={(date, roomTypeId) => {
          setBlockStartDate(date);
          setBlockEndDate(addDaysKey(date, 1));
          setBlockCottageId(roomTypeId);
        }}
      />
    </div>
  );
}

export default AvailabilityPage;
