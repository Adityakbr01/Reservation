import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CkEditorField } from "@/components/common/CkEditorField";
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
  body: string;
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "privacy",
    label: "Privacy Notice & Policy",
    key: "PRIVACY",
    title: "Privacy Notice & Policy",
    body: `<p>At Hamptworth Stays, we respect your privacy and are committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR).</p><h3>1. What Information We Collect</h3><p>When you make a reservation, we collect contact details (name, email address, telephone number, residential address) and payment transaction references.</p><h3>2. How We Use Your Data</h3><p>We use your information solely to process your booking, manage your stay, communicate check-in details, and fulfill legal accounting requirements.</p><h3>3. Contact Us</h3><p>For any privacy-related requests or data deletion queries, please contact us at our registered support email.</p>`,
  },
  {
    id: "terms",
    label: "Booking Conditions & Terms",
    key: "TERMS",
    title: "Booking Conditions & Terms",
    body: `<p>Please read these booking terms and conditions carefully before reserving your cottage stay with Hamptworth Stays.</p><h3>1. Reservation & Payment</h3><p>Payment must be completed through our secure checkout. Once confirmed, you will receive an instant email confirmation and receipt.</p><h3>2. Guest Responsibilities</h3><p>Guests must take reasonable care of the property, furniture, and fittings. Any damages must be reported promptly.</p>`,
  },
  {
    id: "cancellation",
    label: "Cancellation & Refund Policy",
    key: "CANCELLATION",
    title: "Cancellation Policy",
    body: `<p>We understand plans change. Our cancellation schedule is outlined below:</p><ul><li><strong>Full refund:</strong> Cancellations made up to 48 hours prior to check-in.</li><li><strong>Partial refund:</strong> Cancellations made within 48 hours will be subject to a 50% accommodation fee.</li></ul>`,
  },
  {
    id: "house_rules",
    label: "House Rules & Guidelines",
    key: "HOUSE_RULES",
    title: "House Rules & Guidelines",
    body: `<p>To ensure a pleasant stay for all guests and neighbours in our New Forest setting:</p><ul><li><strong>Check-in:</strong> From 3:00 PM onwards.</li><li><strong>Check-out:</strong> By 10:00 AM on departure day.</li><li><strong>Quiet hours:</strong> Between 10:00 PM and 8:00 AM.</li><li><strong>Smoking:</strong> Strictly non-smoking inside cottages.</li></ul>`,
  },
  {
    id: "pets",
    label: "Dog & Pet Policy",
    key: "PETS",
    title: "Dog & Pet Policy",
    body: `<p>We are delighted to welcome dogs to our designated pet-friendly cottages.</p><ul><li>Dogs must be kept on a lead in shared farm and driveway areas.</li><li>Please do not allow dogs on beds or upholstered furniture.</li><li>Please clean up after your pet in the garden and surrounding grounds.</li></ul>`,
  },
  {
    id: "checkin_checkout",
    label: "Check-in & Departure Guide",
    key: "CHECKIN_CHECKOUT",
    title: "Check-in & Departure Guidelines",
    body: `<p>Everything you need to know about arriving and departing smoothly from your Hamptworth cottage:</p><h3>Arrival (Check-in from 3:00 PM)</h3><p>Key lockbox codes are dispatched via email 24 hours prior to arrival. Ample parking is situated adjacent to each cottage.</p><h3>Departure (Check-out by 10:00 AM)</h3><p>Please place used towels in the bathroom hamper and return key to the lockbox.</p>`,
  },
];

function getPublicPolicyUrl(key: string): string {
  const clean = key.toLowerCase();
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `http://localhost:5173/policies/${clean}`;
    }
  }
  return `/policies/${clean}`;
}

export function PoliciesPage() {
  const { data, isPending, refetch } = usePolicies();
  const items = useMemo(() => data ?? [], [data]);

  const [selectedKey, setSelectedKey] = useState<string>("TERMS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

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

  // Keep selectedKey synchronized with actual items
  useEffect(() => {
    if (items.length > 0) {
      const exists = items.some((p) => p.key.toUpperCase() === selectedKey.toUpperCase());
      if (!exists) {
        setSelectedKey(items[0].key);
      }
    }
  }, [items, selectedKey]);

  // Current active policy document
  const currentDoc = useMemo(
    () => items.find((doc) => doc.key.toUpperCase() === selectedKey.toUpperCase()) ?? null,
    [items, selectedKey],
  );

  // Load editor state from active policy document
  useEffect(() => {
    if (currentDoc) {
      setTitle(currentDoc.title || "");
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error("Please provide a valid policy title");
      return;
    }

    savePolicy({
      key: selectedKey,
      title: title.trim(),
      body: body || "<p></p>",
      status: currentDoc?.status ?? "PUBLISHED",
    });
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
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");

    if (!formattedKey || formattedKey.length < 2) {
      setNewKeyError("Policy key must contain at least 2 alphanumeric characters.");
      return;
    }

    if (items.some((p) => p.key.toUpperCase() === formattedKey)) {
      setNewKeyError(`Policy key "${formattedKey}" already exists.`);
      return;
    }

    setNewKeyError(null);
    const finalTitle = newTitle.trim() || formattedKey.replace(/_/g, " ");

    const chosenTemplate = STARTER_TEMPLATES.find((t) => t.id === selectedTemplateId);
    const starterBody = chosenTemplate
      ? chosenTemplate.body
      : `<p>Please review our ${finalTitle} guidelines.</p>`;

    savePolicy(
      {
        key: formattedKey,
        title: finalTitle,
        body: starterBody,
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
    deleteMutation.mutate(selectedKey, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        const remaining = items.filter((p) => p.key.toUpperCase() !== selectedKey.toUpperCase());
        if (remaining.length > 0) {
          setSelectedKey(remaining[0].key);
        }
        void refetch();
      },
    });
  }

  function handleCopyPublicUrl() {
    const url = getPublicPolicyUrl(selectedKey);
    void navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Policy URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
            Policies & Legal Guidelines
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage live guest stay policies, booking conditions, checkout agreements, and house rules.
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
                href={getPublicPolicyUrl(selectedKey)}
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
            <Plus className="size-4" />
            + New Policy
          </Button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                      {tab === "ALL" ? "All" : tab === "PUBLISHED" ? "Published" : "Draft"} ({count})
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
                  const isSelected = selectedKey.toUpperCase() === doc.key.toUpperCase();
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
                            isSelected ? "text-white/80" : "text-muted-foreground"
                          }`}
                        >
                          /{doc.key.toLowerCase()}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isSelected ? "text-white/70" : "text-muted-foreground/80"
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

          {/* Policy Document Meta Box */}
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
                      ? "Currently live and visible to guests on the website."
                      : "Hidden from guests. Only visible to admins."}
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
                      {statusMutation.isPending ? "Updating..." : "Unpublish (Make Draft)"}
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
                      {statusMutation.isPending ? "Updating..." : "Publish (Make Live)"}
                    </Button>
                  )}
                </div>

                <div className="pt-2 border-t space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Version</span>
                    <span className="font-mono font-medium text-foreground">v{currentDoc.version}</span>
                  </div>
                  {(currentDoc.updatedAt || (currentDoc as { updated_at?: string }).updated_at) && (
                    <div className="flex items-center justify-between">
                      <span>Last Updated</span>
                      <span>
                        {new Date(
                          currentDoc.updatedAt ||
                            (currentDoc as { updated_at?: string }).updated_at ||
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
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl truncate">
                        {currentDoc.title || selectedKey}
                      </CardTitle>
                      <Badge variant="outline" className="font-mono text-xs">
                        {selectedKey}
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
                    <CardDescription className="mt-1.5 text-xs sm:text-sm">
                      Public URL:{" "}
                      <code className="text-primary font-mono text-xs">
                        /policies/{selectedKey.toLowerCase()}
                      </code>
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Publish / Unpublish button in top bar */}
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
                        className="border-amber-400 text-amber-900 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/50 text-xs h-8"
                      >
                        Unpublish
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 shadow-xs"
                      >
                        Publish Policy
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPublicUrl}
                      className="gap-1.5"
                    >
                      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      {copied ? "Copied" : "Copy URL"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={getPublicPolicyUrl(selectedKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="size-3.5" />
                        View Live ↗
                      </a>
                    </Button>

                    {items.length > 1 && (
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
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="pol-title">Policy Title / Public Heading</Label>
                    <Input
                      id="pol-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Booking Conditions & Terms"
                      className="font-medium text-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Policy Document Content</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Formatted HTML content shown on the public policies portal and checkout modal.
                    </p>
                    <CkEditorField
                      key={`ck-${selectedKey}`}
                      label=""
                      value={body}
                      onChange={(html) => setBody(html)}
                      placeholder="Write detailed clauses, terms, rules, and guest instructions..."
                      enableImages={true}
                      uploadFolder="policies"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>Versioned & published dynamically to frontend</span>
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
              <Button onClick={() => setIsCreateOpen(true)} className="rounded-full gap-1.5">
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
              {/* Optional Starter Template */}
              <div className="space-y-1.5">
                <Label htmlFor="pol-tpl" className="text-xs font-semibold">
                  Starter Template (Optional)
                </Label>
                <select
                  id="pol-tpl"
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="blank">— Blank (Custom Policy) —</option>
                  {STARTER_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.label} (/{tpl.key.toLowerCase()})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Select a template to pre-fill standard clauses, or start with a blank document.
                </p>
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
                          .toUpperCase()
                          .replace(/[^A-Z0-9_]/g, "_")
                          .slice(0, 30),
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
                  Policy Key (URL Slug) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-pol-key"
                  value={newKey}
                  onChange={(e) => {
                    setNewKey(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9_]/g, "_")
                        .slice(0, 50),
                    );
                    setNewKeyError(null);
                  }}
                  placeholder="e.g. PRIVACY, CANCELLATION, PETS"
                  className="font-mono text-xs uppercase"
                />
                <p className="text-[11px] text-muted-foreground">
                  Forms the website URL:{" "}
                  <code className="text-primary font-mono">
                    /policies/{newKey ? newKey.toLowerCase() : "key"}
                  </code>
                </p>
                {newKeyError && (
                  <p className="text-xs text-destructive font-medium">{newKeyError}</p>
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
                <h3 className="font-semibold text-lg text-foreground">Delete Policy</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to delete <span className="font-semibold text-foreground font-mono">{selectedKey}</span>?
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will remove the policy document permanently from the database and public site.
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
