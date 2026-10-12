import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useEmailTemplates } from "../hooks/use-email-templates";
import type { EmailTemplateCategory } from "../types/email-template.types";

const CATEGORY_FILTERS = ["all", "booking", "payment", "account", "admin"] as const;
const STATUS_FILTERS = ["all", "enabled", "disabled"] as const;

export function EmailTemplatesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>("all");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");

  const filters = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(category !== "all" ? { category: category as EmailTemplateCategory } : {}),
      ...(status !== "all" ? { status } : {}),
    }),
    [search, category, status],
  );
  const { data, isPending, isError, refetch } = useEmailTemplates(filters);
  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
          Email templates
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hamptworth Stays transactional mail — preview, edit copy, and send test emails
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search templates…"
          aria-label="Search templates"
          className="sm:max-w-xs"
        />
        <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
          <SelectTrigger className="sm:w-52" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "all" ? "All categories" : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger className="sm:w-52" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "all" ? "Enabled + disabled" : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading templates">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load templates.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No templates found</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Design</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((template) => (
                  <TableRow key={template.key}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        <Mail aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                        {template.name}
                      </div>
                      <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">
                        {template.subject}
                      </p>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {template.category}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isEnabled ? "success" : "secondary"}>
                        {template.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.isCustomized ? (
                        <Badge variant="warning">Custom</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Default</span>
                      )}
                      {template.essential && (
                        <span className="ml-2 text-xs text-muted-foreground">Essential</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="rounded-full" asChild>
                        <Link to={`/email-templates/${template.key}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default EmailTemplatesPage;
