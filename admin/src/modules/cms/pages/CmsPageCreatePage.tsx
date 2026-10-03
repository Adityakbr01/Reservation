import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageFields, SectionsEditor, SubmitBar } from "../components/PageForm";
import { useSavePage } from "../hooks/use-cms";
import type { PageSection } from "../types/cms.types";

export function CmsPageCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [sections, setSections] = useState<PageSection[]>([]);
  const { mutate, isPending } = useSavePage();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      { payload: { title: title.trim(), slug: slug.trim(), excerpt: excerpt || null, sections } },
      { onSuccess: () => navigate("/cms/pages") },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/cms/pages" className="text-sm font-medium text-brand hover:text-brand-dark">
          ← Back to pages
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">New page</h1>
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
        <SubmitBar label="Create page" pending={isPending} />
      </form>
    </div>
  );
}

export default CmsPageCreatePage;
