import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import beautify from "js-beautify";
import {
  Save,
  ExternalLink,
  ShieldCheck,
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Code,
  Eye,
  Sparkles,
  Monitor,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  usePolicies,
  useSavePolicy,
  useSetPolicyStatus,
  useDeletePolicy,
} from "../hooks/use-cms";

interface StarterTemplate {
  id: string;
  label: string;
  key: string;
  title: string;
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  { id: "blank", label: "— Blank (No Template) —", key: "", title: "" },
  { id: "privacy", label: "Privacy Policy", key: "privacy-policy", title: "Privacy Notice & Policy" },
  { id: "terms", label: "Terms & Conditions", key: "terms-and-conditions", title: "Booking Conditions & Terms" },
  { id: "cancellation", label: "Cancellation Policy", key: "cancellation-policy", title: "Cancellation & Refund Policy" },
  { id: "house_rules", label: "House Rules", key: "house-rules", title: "House Rules & Guidelines" },
];

function prettifyHtml(source: string): string {
  if (!source || !source.trim()) return source;
  try {
    const htmlBeautify =
      beautify?.html ||
      (beautify as unknown as { html?: typeof beautify.html })?.html;
    if (typeof htmlBeautify === "function") {
      return htmlBeautify(source, {
        indent_size: 2,
        wrap_line_length: 120,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        indent_inner_html: true,
      });
    }
    return source;
  } catch {
    return source;
  }
}

function getPublicPolicyUrl(key: string): string {
  const clean = (key || "").trim().toLowerCase();
  const clientBase = (
    import.meta.env.VITE_CLIENT_URL || "https://book.hamptworthstays.com"
  ).replace(/\/+$/, "");
  return `${clientBase}/policies/${clean}/`;
}

export function PoliciesPage() {
  const { data, isPending, refetch } = usePolicies();
  const items = useMemo(() => data ?? [], [data]);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  // Mode: Code editor vs Live preview
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState<number>(0);

  // Create Policy Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank");
  const [newKeyError, setNewKeyError] = useState<string | null>(null);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { mutate: savePolicy, isPending: isSaving } = useSavePolicy();
  const statusMutation = useSetPolicyStatus();
  const deleteMutation = useDeletePolicy();

  // Initialize selectedKey when items load
  useEffect(() => {
    if (items.length > 0) {
      const exists = items.some(
        (p) => (p.key || "").toLowerCase() === selectedKey.toLowerCase(),
      );
      if (!exists) {
        setSelectedKey(items[0].key);
      }
    }
  }, [items, selectedKey]);

  // Current active policy document
  const currentDoc = useMemo(
    () =>
      items.find(
        (doc) => (doc.key || "").toLowerCase() === selectedKey.toLowerCase(),
      ) ?? null,
    [items, selectedKey],
  );

  // Load editor state from active policy document
  useEffect(() => {
    if (currentDoc) {
      setTitle(currentDoc.title || "");
      setSlug(currentDoc.key || "");
      setBody(currentDoc.body || "");
    }
  }, [currentDoc]);

  // Filtered policies based on search query and status filter
  const filteredPolicies = useMemo(() => {
    return items.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = (p.title || "").toLowerCase().includes(query);
        const matchesKey = (p.key || "").toLowerCase().includes(query);
        return matchesTitle || matchesKey;
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  function handleFormatHtml() {
    const formatted = prettifyHtml(body);
    setBody(formatted);
    toast.success("Code formatted");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error("Please provide a valid policy title");
      return;
    }

    const cleanSlug = (slug.trim() || selectedKey)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      toast.error("Please provide a valid URL slug for this policy");
      return;
    }

    savePolicy(
      {
        id: currentDoc?.id,
        previous_key: currentDoc?.key,
        key: cleanSlug,
        title: title.trim(),
        body: body ?? "",
        status: currentDoc?.status ?? "PUBLISHED",
      },
      {
        onSuccess: () => {
          setSelectedKey(cleanSlug);
          void refetch();
        },
      },
    );
  }

  function handleTemplateSelect(tplId: string) {
    setSelectedTemplateId(tplId);
    if (tplId === "blank") {
      setNewTitle("");
      setNewKey("");
      return;
    }
    const tpl = STARTER_TEMPLATES.find((t) => t.id === tplId);
    if (tpl) {
      setNewTitle(tpl.title);
      setNewKey(tpl.key);
      setNewKeyError(null);
    }
  }

  function handleCreatePolicy(e: FormEvent) {
    e.preventDefault();
    const formattedKey = newKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!formattedKey || formattedKey.length < 2) {
      setNewKeyError("Policy slug must contain at least 2 alphanumeric characters.");
      return;
    }

    if (items.some((p) => (p.key || "").toLowerCase() === formattedKey)) {
      setNewKeyError(`Policy slug "${formattedKey}" already exists.`);
      return;
    }

    setNewKeyError(null);
    const finalTitle = newTitle.trim() || formattedKey.replace(/[-_]/g, " ");

    savePolicy(
      {
        key: formattedKey,
        title: finalTitle,
        body: "",
        status: "PUBLISHED",
      },
      {
        onSuccess: () => {
          setSelectedKey(formattedKey);
          setIsCreateOpen(false);
          setNewKey("");
          setNewTitle("");
          setSelectedTemplateId("blank");
          void refetch();
        },
      },
    );
  }

  function handleDeletePolicy() {
    if (!currentDoc) return;
    deleteMutation.mutate(currentDoc.key, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        const remaining = items.filter(
          (p) => (p.key || "").toLowerCase() !== currentDoc.key.toLowerCase(),
        );
        if (remaining.length > 0) {
          setSelectedKey(remaining[0].key);
        } else {
          setSelectedKey("");
        }
        void refetch();
      },
    });
  }

  function handleCopyPublicUrl() {
    const url = getPublicPolicyUrl(slug || selectedKey);
    void navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Policy URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  // Generate safe preview HTML document with user-authored HTML/CSS/JS
  const previewHtml = useMemo(() => {
    return body || "<div style='padding: 32px; text-align: center; color: #888; font-family: sans-serif;'>No HTML content yet. Switch to Code Editor to enter your HTML/CSS/JS.</div>";
  }, [body]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
            Policies & Custom Pages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Author full HTML, CSS, and JS policy documents with real-time live preview and custom URL slugs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentDoc && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-1.5"
              asChild
            >
              <a
                href={getPublicPolicyUrl(slug || selectedKey)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                <ExternalLink className="size-3.5" />
                View on website ↗
              </a>
            </Button>
          )}

          <Button
            onClick={() => {
              setSelectedTemplateId("blank");
              setNewKey("");
              setNewTitle("");
              setNewKeyError(null);
              setIsCreateOpen(true);
            }}
            size="sm"
            className="rounded-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />+ New Policy
          </Button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Sidebar: Document Directory */}
        <div className="space-y-4">
          <Card className="shadow-xs border">
            <CardHeader className="p-4 pb-3 border-b space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Policy Directory ({items.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplateId("blank");
                    setNewKey("");
                    setNewTitle("");
                    setNewKeyError(null);
                    setIsCreateOpen(true);
                  }}
                  className="h-7 px-2 text-xs text-primary font-medium hover:bg-primary/10"
                >
                  <Plus className="size-3.5 mr-1" />
                  New
                </Button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Filter policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-md"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex gap-1 text-xs">
                {(["ALL", "PUBLISHED", "DRAFT"] as const).map((tab) => {
                  const count =
                    tab === "ALL"
                      ? items.length
                      : items.filter((p) => p.status === tab).length;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                        statusFilter === tab
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {tab === "ALL"
                        ? "All"
                        : tab === "PUBLISHED"
                          ? "Published"
                          : "Draft"}{" "}
                      ({count})
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            {/* List */}
            <CardContent className="p-2 space-y-1 max-h-[580px] overflow-y-auto">
              {isPending && items.length === 0 ? (
                <div className="text-center py-8 px-4 text-xs text-muted-foreground">
                  Loading policies...
                </div>
              ) : filteredPolicies.length === 0 ? (
                <div className="text-center py-8 px-4 text-xs text-muted-foreground space-y-2">
                  <p>No policies found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-full"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    + Create Policy
                  </Button>
                </div>
              ) : (
                filteredPolicies.map((doc) => {
                  const isSelected =
                    selectedKey.toLowerCase() === (doc.key || "").toLowerCase();
                  const isPublished = doc.status === "PUBLISHED";
                  const isDraft = doc.status === "DRAFT";

                  return (
                    <button
                      key={doc.id || doc.key}
                      type="button"
                      onClick={() => setSelectedKey(doc.key)}
                      className={`w-full text-left rounded-lg p-2.5 transition flex flex-col gap-1 border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "hover:bg-muted/50 border-transparent text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-medium text-xs truncate">
                          {doc.title || doc.key}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : isPublished
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : isDraft
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span
                          className={`font-mono text-[11px] truncate ${
                            isSelected
                              ? "text-white/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          /{doc.key.toLowerCase()}/
                        </span>
                        <span
                          className={`text-[10px] ${
                            isSelected
                              ? "text-white/70"
                              : "text-muted-foreground/80"
                          }`}
                        >
                          v{doc.version ?? 1}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Policy Meta Box */}
          {currentDoc && (
            <Card className="border">
              <CardContent className="p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </span>
                    {currentDoc.status === "PUBLISHED" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                        <span className="size-2 rounded-full bg-emerald-600" />
                        PUBLISHED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                        <span className="size-2 rounded-full bg-amber-600" />
                        DRAFT
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {currentDoc.status === "PUBLISHED"
                      ? "Live and accessible to visitors on the booking site."
                      : "Draft mode. Hidden from public view."}
                  </p>
                </div>

                <div className="pt-2 border-t flex flex-col gap-2">
                  {currentDoc.status === "PUBLISHED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate(
                          { key: currentDoc.key, to: "DRAFT" },
                          { onSuccess: () => void refetch() },
                        )
                      }
                      className="w-full border-amber-400 text-amber-900 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/50 font-medium"
                    >
                      {statusMutation.isPending
                        ? "Updating..."
                        : "Unpublish (Make Draft)"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate(
                          { key: currentDoc.key, to: "PUBLISHED" },
                          { onSuccess: () => void refetch() },
                        )
                      }
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    >
                      {statusMutation.isPending
                        ? "Updating..."
                        : "Publish (Make Live)"}
                    </Button>
                  )}
                </div>

                <div className="pt-2 border-t space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Version</span>
                    <span className="font-mono font-medium text-foreground">
                      v{currentDoc.version}
                    </span>
                  </div>
                  {(currentDoc.updatedAt ||
                    (currentDoc as { updated_at?: string }).updated_at) && (
                    <div className="flex items-center justify-between">
                      <span>Last Updated</span>
                      <span>
                        {new Date(
                          currentDoc.updatedAt ||
                            (currentDoc as { updated_at?: string })
                              .updated_at ||
                            "",
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Main Area: Edit Policy Form */}
        <div className="space-y-6 min-w-0">
          {currentDoc ? (
            <Card className="border shadow-xs">
              <CardHeader className="pb-4 border-b">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl truncate">
                        {currentDoc.title || selectedKey}
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">
                        /{selectedKey}/
                      </Badge>
                      {currentDoc.status === "PUBLISHED" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                          <span className="size-2 rounded-full bg-emerald-600" />
                          PUBLISHED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                          <span className="size-2 rounded-full bg-amber-600" />
                          DRAFT
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs sm:text-sm flex flex-wrap items-center gap-2">
                      <span>Live URL:</span>
                      <a
                        href={getPublicPolicyUrl(slug || selectedKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1"
                      >
                        {getPublicPolicyUrl(slug || selectedKey)}
                        <ExternalLink className="size-3" />
                      </a>
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPublicUrl}
                      className="gap-1.5"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy URL"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteOpen(true)}
                      className="text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title & Editable Slug */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="pol-title">Policy Title</Label>
                      <Input
                        id="pol-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Booking Conditions & Terms"
                        className="font-medium text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pol-slug">
                        URL Slug <span className="text-xs text-muted-foreground font-normal">(Customizable)</span>
                      </Label>
                      <div className="flex rounded-md shadow-xs">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs font-mono">
                          /policies/
                        </span>
                        <Input
                          id="pol-slug"
                          value={slug}
                          onChange={(e) =>
                            setSlug(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_-]/g, "-"),
                            )
                          }
                          placeholder="e.g. privacy-policy"
                          className="rounded-l-none font-mono text-xs"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Public link: <code className="text-primary font-mono">{getPublicPolicyUrl(slug || selectedKey)}</code>
                      </p>
                    </div>
                  </div>

                  {/* Mode Bar: Code Editor vs Live Preview */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border">
                        <button
                          type="button"
                          onClick={() => setViewMode("code")}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                            viewMode === "code"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Code className="size-3.5" />
                          Code Editor (HTML/CSS/JS)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setViewMode("preview");
                            setPreviewKey((k) => k + 1);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                            viewMode === "preview"
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Eye className="size-3.5" />
                          Live Preview
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {viewMode === "code" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleFormatHtml}
                            className="h-8 text-xs gap-1.5"
                          >
                            <Sparkles className="size-3.5 text-primary" />
                            Format Code
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDevice("desktop")}
                              className={`h-8 px-2.5 text-xs gap-1 ${
                                previewDevice === "desktop"
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : ""
                              }`}
                            >
                              <Monitor className="size-3.5" />
                              Desktop
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDevice("mobile")}
                              className={`h-8 px-2.5 text-xs gap-1 ${
                                previewDevice === "mobile"
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : ""
                              }`}
                            >
                              <Smartphone className="size-3.5" />
                              Mobile
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewKey((k) => k + 1)}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Refresh preview"
                            >
                              <RefreshCw className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View Switcher: CodeMirror or IFrame Sandbox */}
                    {viewMode === "code" ? (
                      <div className="space-y-1.5">
                        <div className="rounded-lg border overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-primary/40">
                          <CodeMirror
                            value={body}
                            height="520px"
                            extensions={[html()]}
                            onChange={(value) => setBody(value)}
                            theme="dark"
                            basicSetup={{
                              lineNumbers: true,
                              highlightActiveLineGutter: true,
                              foldGutter: true,
                              dropCursor: true,
                              allowMultipleSelections: true,
                              indentOnInput: true,
                              bracketMatching: true,
                              closeBrackets: true,
                              autocompletion: true,
                              rectangularSelection: true,
                              crosshairCursor: true,
                              highlightActiveLine: true,
                              highlightSelectionMatches: true,
                              closeBracketsKeymap: true,
                              defaultKeymap: true,
                              searchKeymap: true,
                              historyKeymap: true,
                              foldKeymap: true,
                              completionKeymap: true,
                              lintKeymap: true,
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>
                            Tip: You can add arbitrary HTML tags, inline <code>&lt;style&gt;</code> blocks, Tailwind classes, and custom <code>&lt;script&gt;</code> tags.
                          </span>
                          <span>{body.length} characters</span>
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-muted/30 p-4 min-h-[520px] flex flex-col items-center justify-center">
                        <div
                          className={`transition-all duration-200 bg-background rounded-lg border shadow-sm overflow-hidden w-full ${
                            previewDevice === "mobile"
                              ? "max-w-[390px] h-[650px]"
                              : "max-w-full h-[540px]"
                          }`}
                        >
                          <iframe
                            key={previewKey}
                            srcDoc={previewHtml}
                            title="Live Policy Preview"
                            sandbox="allow-scripts allow-same-origin"
                            className="w-full h-full border-0 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>Renders raw HTML/CSS/JS directly on booking site</span>
                    </div>
                    <Button
                      type="submit"
                      className="rounded-full px-7 gap-2"
                      disabled={isSaving}
                    >
                      <Save className="size-4" />
                      {isSaving ? "Saving…" : "Save Policy"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border p-8 text-center space-y-4">
              <FileText className="size-12 mx-auto text-muted-foreground/60" />
              <div>
                <h3 className="font-semibold text-lg">No Policy Selected</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new policy or choose one from the directory to start editing.
                </p>
              </div>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="rounded-full gap-1.5"
              >
                <Plus className="size-4" />
                Create New Policy
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Create Policy Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-background rounded-2xl border shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-semibold text-lg">Create New Policy</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add a dynamic stay policy, legal notice, or guest guidelines document.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pol-tpl" className="text-xs font-semibold">
                  Preset Title (Optional)
                </Label>
                <select
                  id="pol-tpl"
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {STARTER_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-pol-title" className="text-xs font-semibold">
                  Policy Title / Heading <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-pol-title"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (selectedTemplateId === "blank" && !newKey) {
                      setNewKey(
                        e.target.value
                          .trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "-")
                          .slice(0, 40),
                      );
                    }
                  }}
                  placeholder="e.g. Privacy Notice & Policy"
                  className="text-sm font-medium"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-pol-key" className="text-xs font-semibold">
                  Policy URL Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-pol-key"
                  value={newKey}
                  onChange={(e) => {
                    setNewKey(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, "-")
                        .slice(0, 50),
                    );
                    setNewKeyError(null);
                  }}
                  placeholder="e.g. privacy-policy, house-rules, cancellation"
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Forms the website URL:{" "}
                  <code className="text-primary font-mono">
                    {getPublicPolicyUrl(newKey ? newKey.toLowerCase() : "slug")}
                  </code>
                </p>
                {newKeyError && (
                  <p className="text-xs text-destructive font-medium">
                    {newKeyError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || !newKey.trim() || !newTitle.trim()}
                  className="rounded-full px-5 gap-1.5"
                >
                  <Plus className="size-4" />
                  {isSaving ? "Creating..." : "Create Policy"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-background rounded-2xl border shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-6 shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  Delete Policy
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground font-mono">
                    {slug || selectedKey}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will permanently delete this policy document from the database and public site.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={handleDeletePolicy}
                className="rounded-full px-5 gap-1.5"
              >
                <Trash2 className="size-4" />
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PoliciesPage;
