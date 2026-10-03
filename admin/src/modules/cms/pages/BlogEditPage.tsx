import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusButtons } from "../components/StatusButtons";
import { PageFields, SubmitBar } from "../components/PageForm";
import { useBlog, useSaveBlog, useSetBlogStatus } from "../hooks/use-cms";
import type { ContentStatus } from "../types/cms.types";

const TEXTAREA_CLASS =
  "flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function BlogEditPage({ mode }: { mode: "create" | "edit" }) {
  const { id = "" } = useParams();
  const { data: item, isPending: isLoading, isError } = useBlog(mode === "edit" ? id : "");

  if (mode === "edit" && (isLoading || !item)) {
    return (
      <div className="mx-auto w-full max-w-sm py-8 text-center">
        <p className="font-medium">{isError ? "Post not found." : "Loading post…"}</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link to="/cms/blogs">Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <BlogForm
      key={mode === "edit" ? id : "new"}
      mode={mode}
      id={id}
      initial={
        item
          ? {
              title: item.title,
              slug: item.slug,
              excerpt: item.excerpt ?? "",
              content: item.content,
              author: item.author ?? "",
              category: item.category ?? "",
              tags: (item.tags ?? []).join(", "),
              status: item.status,
              version: item.version,
            }
          : undefined
      }
    />
  );
}

interface BlogInitial {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string;
  status: ContentStatus;
  version: number;
}

function BlogForm({ mode, id, initial }: { mode: "create" | "edit"; id: string; initial?: BlogInitial }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const { mutate, isPending } = useSaveBlog();
  const statusMutation = useSetBlogStatus();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      {
        ...(mode === "edit" ? { id } : {}),
        payload: {
          ...(mode === "edit" && initial ? { version: initial.version } : {}),
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt || null,
          content,
          author: author.trim() || null,
          category: category.trim() || null,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      },
      { onSuccess: () => navigate("/cms/blogs") },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/cms/blogs" className="text-sm font-medium text-brand hover:text-brand-dark">
            ← Back to blog
          </Link>
          <h1 className="mt-2 font-display text-3xl font-light tracking-tight">
            {mode === "create" ? "New post" : (initial?.title ?? "Edit post")}
          </h1>
        </div>
        {mode === "edit" && initial && (
          <StatusButtons
            status={initial.status}
            pending={statusMutation.isPending}
            onChange={(to) => statusMutation.mutate({ id, version: initial.version, to })}
          />
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PageFields
              title={title}
              slug={slug}
              excerpt={excerpt}
              onTitle={setTitle}
              onSlug={setSlug}
              onExcerpt={setExcerpt}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="blog-author">Author</Label>
                <Input
                  id="blog-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-category">Category</Label>
                <Input
                  id="blog-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-tags">Tags (comma separated)</Label>
                <Input id="blog-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="blog-content" className="sr-only">
              Content
            </Label>
            <textarea
              id="blog-content"
              className={TEXTAREA_CLASS}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the post (simple HTML allowed)…"
            />
          </CardContent>
        </Card>
        <SubmitBar label={mode === "create" ? "Create post" : "Save changes"} pending={isPending} />
      </form>
    </div>
  );
}

export default BlogEditPage;
