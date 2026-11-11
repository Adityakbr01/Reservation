import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlogPost, useBlogPosts, useCmsPage, useFaqs, usePolicies, usePolicyDoc } from "../hooks/use-cms";
import { CmsSections } from "../components/CmsSections";
import { CottageImage } from "@/components/common/CottageImage";
import { useMediaUrls } from "@/modules/media";
import { formatDateTime } from "@/lib/date";

function NotFound({ back, label }: { back: string; label: string }) {
  return (
    <div className="mx-auto w-full max-w-sm py-8 text-center">
      <p className="font-medium">Nothing published here yet.</p>
      <Button asChild variant="outline" className="mt-4 rounded-full">
        <Link to={back}>{label}</Link>
      </Button>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return formatDateTime(value);
}

export function CmsPageView() {
  const { slug = "" } = useParams();
  const { data, isPending, isError } = useCmsPage(slug);
  const { data: photos } = useMediaUrls(data?.featuredImageMediaId ? [data.featuredImageMediaId] : []);

  if (isPending) return <div className="h-64 animate-pulse rounded-xl bg-muted" aria-label="Loading page" />;
  if (isError || !data) return <NotFound back="/" label="Back home" />;

  return (
    <article className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      {photos?.[0]?.url && (
        <img src={photos[0].url} alt="" className="aspect-[21/9] w-full rounded-xl object-cover" loading="lazy" />
      )}
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">{data.title}</h1>
        {data.excerpt && <p className="mt-2 text-muted-foreground">{data.excerpt}</p>}
      </div>
      <CmsSections sections={data.sections} />
    </article>
  );
}

export function BlogsPage() {
  const { data, isPending } = useBlogPosts();
  const items = data ?? [];
  const coverIds = items.map((post) => post.featuredImageMediaId).filter((id): id is string => Boolean(id));
  const { data: photos } = useMediaUrls(coverIds);
  const photoById = new Map((photos ?? []).map((photo) => [photo.id, photo] as const));
  return (
    <div className="w-full space-y-6 pb-8">
      <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Blog</h1>
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading posts">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No stories yet — check back soon.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              imageUrl={post.featuredImageMediaId ? (photoById.get(post.featuredImageMediaId)?.url ?? null) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlogCard({ post, imageUrl }: { post: { id: string; slug: string; title: string; excerpt: string | null; author: string | null; category: string | null; readingMinutes: number; publishedAt: string | null }; imageUrl: string | null }) {
  return (
    <Card className="overflow-hidden shadow-card">
      {imageUrl && (
        <div className="p-2.5 pb-0">
          <div className="aspect-[16/9] w-full overflow-hidden rounded-xl">
            <CottageImage name={post.title} imageUrl={imageUrl} alt={`${post.title} cover`} />
          </div>
        </div>
      )}
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {post.category && <Badge variant="secondary">{post.category}</Badge>}
          <p className="text-xs text-muted-foreground">
            {[post.author, formatDate(post.publishedAt), `${post.readingMinutes} min read`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <CardTitle className="text-xl">
          <Link to={`/blogs/${post.slug}`} className="hover:text-brand">
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>
      {post.excerpt && (
        <CardContent className="p-4 pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function BlogPostPage() {
  const { slug = "" } = useParams();
  const { data, isPending, isError } = useBlogPost(slug);
  const { data: photos } = useMediaUrls(data?.featuredImageMediaId ? [data.featuredImageMediaId] : []);

  if (isPending) return <div className="h-64 animate-pulse rounded-xl bg-muted" aria-label="Loading post" />;
  if (isError || !data) return <NotFound back="/blogs" label="All posts" />;

  return (
    <article className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <Link to="/blogs" className="text-sm font-medium text-brand hover:text-brand-dark">
        ← All posts
      </Link>
      {photos?.[0]?.url && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="aspect-[21/9] w-full">
            <CottageImage name={data.title} imageUrl={photos[0].url} alt={photos[0].alt} />
          </div>
        </div>
      )}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {data.category && <Badge variant="secondary">{data.category}</Badge>}
          <p className="text-sm text-muted-foreground">
            {[data.author, formatDate(data.publishedAt), `${data.readingMinutes} min read`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight sm:text-4xl">{data.title}</h1>
        {data.tags && data.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {data.content && (
        <div className="rich-text leading-relaxed" dangerouslySetInnerHTML={{ __html: data.content }} />
      )}
    </article>
  );
}

export function FaqsPage() {
  const { data, isPending } = useFaqs();
  const items = data ?? [];
  return (
    <div className="w-full space-y-6 pb-8">
      <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">FAQs</h1>
      {isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading FAQs" />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No questions yet.</p>
      ) : (
        items.map((faq) => (
          <details key={faq.id} className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer font-medium">{faq.question}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
          </details>
        ))
      )}
    </div>
  );
}

function RawHtmlJsRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Extract title from HTML if provided
    const titleEl = el.querySelector("title");
    if (titleEl && titleEl.textContent) {
      document.title = titleEl.textContent;
    }

    // Browser does not execute <script> tags inserted via innerHTML.
    // Re-create each <script> tag so custom JS executes.
    // Also wrap listeners so DOMContentLoaded / load fire immediately if document is already ready.
    const scripts = Array.from(el.querySelectorAll("script"));
    const createdScripts: HTMLScriptElement[] = [];

    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });

      const rawCode = oldScript.textContent || "";
      if (rawCode.trim()) {
        newScript.textContent = `
(function() {
  var origDocAdd = document.addEventListener;
  var origWinAdd = window.addEventListener;
  document.addEventListener = function(evt, handler, opts) {
    if ((evt === 'DOMContentLoaded' || evt === 'load') && document.readyState !== 'loading') {
      try { handler(new Event(evt)); } catch(e) { console.error(e); }
      return;
    }
    return origDocAdd.call(document, evt, handler, opts);
  };
  window.addEventListener = function(evt, handler, opts) {
    if ((evt === 'DOMContentLoaded' || evt === 'load') && document.readyState !== 'loading') {
      try { handler(new Event(evt)); } catch(e) { console.error(e); }
      return;
    }
    return origWinAdd.call(window, evt, handler, opts);
  };
  try {
    ${rawCode}
  } catch(e) {
    console.error("Policy custom script execution error:", e);
  } finally {
    document.addEventListener = origDocAdd;
    window.addEventListener = origWinAdd;
  }
})();
`;
      }

      oldScript.parentNode?.replaceChild(newScript, oldScript);
      createdScripts.push(newScript);
    });

    return () => {
      createdScripts.forEach((s) => s.parentNode?.removeChild(s));
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="w-full min-h-screen"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function PolicyPage() {
  const { key } = useParams();
  const { data: allPolicies, isPending: isAllPending } = usePolicies();

  const normalizedKey = (key || allPolicies?.[0]?.key || "terms").toLowerCase();
  const { data: singlePolicy, isPending: isSinglePending, isError } = usePolicyDoc(normalizedKey);

  const activePolicy =
    allPolicies?.find((p) => (p.key || "").toLowerCase() === normalizedKey) ?? singlePolicy;
  const isPending = (isAllPending && !allPolicies) || (isSinglePending && !singlePolicy);

  if (isPending && !activePolicy) {
    return (
      <div className="w-full py-20 flex items-center justify-center text-muted-foreground text-sm" aria-label="Loading policy">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  if (isError || !activePolicy) {
    return <NotFound back="/" label="Back home" />;
  }

  return (
    <main className="w-full">
      <RawHtmlJsRenderer html={activePolicy.body} />
    </main>
  );
}
