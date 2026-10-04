import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusButtons } from "../components/StatusButtons";
import { RichTextEditor } from "../components/RichTextEditor";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { useDeleteFaq, useFaqs, useSaveFaq, useSetFaqStatus } from "../hooks/use-cms";

export function FaqsPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const { data, isPending, isError, refetch } = useFaqs({ page: 1, limit: 100 });
  const { mutate: save, isPending: isSaving } = useSaveFaq();
  const { mutate: remove, isPending: isRemoving } = useDeleteFaq();
  const statusMutation = useSetFaqStatus();
  const items = data?.items ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (question.trim().length < 4) return;
    save(
      {
        payload: {
          question: question.trim(),
          answer,
          category: category.trim() || null,
          sortOrder: items.length,
        },
      },
      {
        onSuccess: () => {
          setQuestion("");
          setAnswer("");
          setCategory("");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">FAQs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} questions` : "Guest questions, sorted by category"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New question</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="faq-q">Question</Label>
              <Input
                id="faq-q"
                required
                minLength={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-cat">Category</Label>
              <Input
                id="faq-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <RichTextEditor label="Answer" value={answer} onChange={setAnswer} />
            </div>
            <div>
              <Button type="submit" className="rounded-full" disabled={isSaving}>
                {isSaving ? "Saving…" : "Add FAQ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading FAQs">
          {[0, 1].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load FAQs.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.question}</TableCell>
                <TableCell className="text-muted-foreground">{item.category ?? "—"}</TableCell>
                <TableCell>
                  <StatusButtons
                    status={item.status}
                    pending={statusMutation.isPending}
                    onChange={(to) =>
                      statusMutation.mutate({ id: item.id, version: item.version, to })
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <ConfirmButton
                    title="Delete this FAQ?"
                    description="The question is permanently removed. Published FAQs must be archived first."
                    pending={isRemoving}
                    onConfirm={() => remove(item.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default FaqsPage;
