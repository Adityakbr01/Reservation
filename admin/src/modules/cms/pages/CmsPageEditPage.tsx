import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusButtons } from "../components/StatusButtons";
import { PageFields, SectionsEditor, SubmitBar } from "../components/PageForm";
import { ImageField } from "@/components/common/ImageField";
import { usePage, useSavePage, useSetPageStatus } from "../hooks/use-cms";
import type { CmsPage, PageSection } from "../types/cms.types";

export function CmsPageEditPage() {
  const { id = "" } = useParams();
  const { data: item, isPending: isLoading, isError, refetch } = usePage(id);

  if (isLoading || !item) {
    return (
      <div className="mx-auto w-full max-w-sm py-8 text-center">
        <p className="font-medium">{isError ? "Page not found." : "Loading page…"}</p>
        <div className="mt-4 flex gap-2">
          {isError && (
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
          )}
          <Button asChild className="flex-1 rounded-full">
            <Link to="/cms/pages">Back to list</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <PageForm key={id} id={id} initial={item} />;
}

function PageForm({ id, initial }: { id: string; initial: CmsPage }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? "");
  const [sections, setSections] = useState<PageSection[]>(initial.sections ?? []);
  const [featuredImageMediaId, setFeaturedImageMediaId] = useState<string | null>(
    initial.featuredImageMediaId ?? null,
  );
  const { mutate, isPending } = useSavePage();
  const statusMutation = useSetPageStatus();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      {
        id,
        payload: {
          version: initial.version,
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt || null,
          sections,
          featuredImageMediaId,
        },
      },
      { onSuccess: () => navigate("/cms/pages") },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/cms/pages" className="text-sm font-medium text-brand hover:text-brand-dark">
            ← Back to pages
          </Link>
          <h1 className="mt-2 font-display text-3xl font-light tracking-tight">{initial.title}</h1>
        </div>
        <StatusButtons
          status={initial.status}
          pending={statusMutation.isPending}
          onChange={(to) => statusMutation.mutate({ id, version: initial.version, to })}
        />
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <PageFields
              title={title}
              slug={slug}
              excerpt={excerpt}
              onTitle={setTitle}
              onSlug={setSlug}
              onExcerpt={setExcerpt}
            />
            <div className="mt-4">
              <ImageField
                label="Cover image"
                mediaId={featuredImageMediaId}
                onChange={setFeaturedImageMediaId}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionsEditor value={sections} onChange={setSections} />
          </CardContent>
        </Card>
        <SubmitBar label="Save changes" pending={isPending} />
      </form>
    </div>
  );
}

export default CmsPageEditPage;
