import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Mustache from "mustache";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import beautify from "js-beautify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { formatDateTimeWithTime } from "@/lib/date";
import { previewEmailTemplate } from "../api/email-templates.api";
import {
  useDeleteEmailTemplate,
  useEmailTemplate,
  useSendTestEmailTemplate,
  useUpdateEmailTemplate,
} from "../hooks/use-email-templates";
import type { EmailTemplateDetail, EmailTemplatePreview } from "../types/email-template.types";

function prettifyHtml(source: string): string {
  if (!source || !source.trim()) return source;
  try {
    return beautify.html(source, {
      indent_size: 2,
      wrap_line_length: 100,
      preserve_newlines: true,
      max_preserve_newlines: 2,
      indent_inner_html: true,
      extra_liners: ["head", "body", "/html", "table", "/table", "tr", "/tr", "p", "/p", "div", "/div"],
    });
  } catch {
    return source;
  }
}

// Mustache escapes "/" as &#x2F; by default; the server escapes only & < > " '.
// Align the two so the local live preview is byte-identical to server output.
Mustache.escape = (text: unknown): string =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  setter: (value: string) => void,
  current: string,
  snippet: string,
  cmRef?: React.RefObject<ReactCodeMirrorRef | null>,
): void {
  if (cmRef?.current?.view) {
    const view = cmRef.current.view;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: snippet },
      selection: { anchor: from + snippet.length },
    });
    view.focus();
    return;
  }
  const element = ref.current;
  if (!element) {
    setter(`${current}${snippet}`);
    return;
  }
  const start = element.selectionStart ?? current.length;
  const end = element.selectionEnd ?? current.length;
  setter(`${current.slice(0, start)}${snippet}${current.slice(end)}`);
  requestAnimationFrame(() => {
    element.focus();
    const caret = start + snippet.length;
    element.setSelectionRange(caret, caret);
  });
}

export function EmailTemplateEditPage() {
  const { key = "" } = useParams();
  const { data: detail, isPending, isError, refetch } = useEmailTemplate(key);
  const updateMutation = useUpdateEmailTemplate(key);
  const deleteMutation = useDeleteEmailTemplate(key);
  const testMutation = useSendTestEmailTemplate();

  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [serverPreview, setServerPreview] = useState<EmailTemplatePreview | null>(null);
  const [serverPreviewError, setServerPreviewError] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [saveError, setSaveError] = useState<string | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<"subject" | "html" | "text">("html");
  const loadedRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  function filledSnapshot(source: EmailTemplateDetail): {
    subject: string;
    htmlBody: string;
    textBody: string;
  } {
    if (source.isCustomized) {
      // Saved design wins.
      return {
        subject: source.subject,
        htmlBody: source.htmlBody ?? "",
        textBody: source.textBody ?? "",
      };
    }
    // No saved design: pre-fill the full default content converted back to
    // editable {{variables}}, so the editor never opens empty.
    return { ...source.editableSource };
  }

  function fillFromDetail(source: EmailTemplateDetail): void {
    const filled = filledSnapshot(source);
    const prettyHtml = prettifyHtml(filled.htmlBody);
    setSubject(filled.subject);
    setHtmlBody(prettyHtml);
    setTextBody(filled.textBody);
    setIsEnabled(source.isEnabled);
    setSaveError(null);
    pristineRef.current = JSON.stringify({
      subject: filled.subject,
      htmlBody: prettyHtml,
      textBody: filled.textBody,
    });
  }

  // Snapshot of what the editor was filled with — the draft detector
  // compares against this (not against the saved row), so an untouched
  // pre-filled editor still previews the effective design, not a draft.
  const pristineRef = useRef<string | null>(null);

  // Fill the editor when the template (or its saved revision) changes —
  // never on background refetches, so in-progress typing is never clobbered.
  useEffect(() => {
    if (!detail) return;
    const stamp = `${key}:${detail.isCustomized ? "custom" : "default"}:${detail.updatedAt ?? "none"}`;
    if (loadedRef.current === stamp) return;
    loadedRef.current = stamp;
    fillFromDetail(detail);
    readyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, key]);

  // Live preview: renders instantly in the browser with Mustache using the
  // server-provided dummy values — no round-trip, so typing always updates
  // immediately. Untouched content shows the effective server render.
  const pristineSnapshot = pristineRef.current;
  const livePreview: EmailTemplatePreview | null = useMemo(() => {
    const current = JSON.stringify({ subject, htmlBody, textBody });
    const isDraft = pristineSnapshot !== null && current !== pristineSnapshot;
    if (!isDraft) return serverPreview;
    const vars = serverPreview?.dummyVars ?? {};
    return {
      subject: subject.trim() ? Mustache.render(subject, vars) : (serverPreview?.subject ?? ""),
      html: htmlBody.trim() ? Mustache.render(htmlBody, vars) : (serverPreview?.html ?? ""),
      text: textBody.trim() ? Mustache.render(textBody, vars) : (serverPreview?.text ?? ""),
      source: "draft" as const,
      variables: serverPreview?.variables ?? { required: [], optional: [] },
      dummyVars: vars,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPreview, subject, htmlBody, textBody, pristineSnapshot]);

  // Unknown {{variables}} render empty and are rejected on save — flag
  // them inline while typing instead of failing silently.
  const unknownVars = useMemo(() => {
    if (!detail) return [];
    const allowed = new Set([...detail.requiredVars, ...detail.optionalVars]);
    const found = new Set<string>();
    const pattern = /{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g;
    for (const field of [subject, htmlBody, textBody]) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(field)) !== null) {
        found.add(match[1] as string);
      }
    }
    return [...found].filter((name) => !allowed.has(name)).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, subject, htmlBody, textBody]);

  // Effective server render, fetched when the template (or revision) loads.
  useEffect(() => {
    if (!detail || !key || !readyRef.current) return;
    let cancelled = false;
    previewEmailTemplate(key).then(
      (result) => {
        if (cancelled) return;
        setServerPreview(result);
        setServerPreviewError(null);
      },
      (error: unknown) => {
        if (cancelled) return;
        const status = error instanceof ApiError ? error.status : undefined;
        setServerPreviewError(
          status === 404
            ? "Preview endpoint not found (404) — the API server is running older code. Pull the latest server code, restart it (rebuild dist first if you run npm start), then reload this page."
            : getApiErrorMessage(error),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [detail, key]);

  if (isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading template">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (isError || !detail) {
    return (
      <div className="rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Could not load this template.</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const allVars = [...detail.requiredVars, ...detail.optionalVars];

  function handleInsertVar(name: string): void {
    const snippet = `{{${name}}}`;
    if (lastField.current === "subject") {
      insertAtCursor(subjectRef, setSubject, subject, snippet);
    } else if (lastField.current === "text") {
      insertAtCursor(textRef, setTextBody, textBody, snippet);
    } else {
      insertAtCursor(htmlRef, setHtmlBody, htmlBody, snippet, cmRef);
    }
  }

  function handleFormatHtml(): void {
    setHtmlBody((prev) => prettifyHtml(prev));
  }

  function handleSave() {
    setSaveError(null);
    updateMutation.mutate(
      { subject, htmlBody, textBody, isEnabled },
      {
        onError: (error) => setSaveError(getApiErrorMessage(error)),
      },
    );
  }

  function handleLoadStarter() {
    if (!detail) return;
    lastField.current = "html";
    setSubject(detail.starter.subject);
    setHtmlBody(prettifyHtml(detail.starter.htmlBody));
    setTextBody(detail.starter.textBody);
  }

  function handleReloadSaved() {
    loadedRef.current = null;
    void refetch().then((result) => {
      if (result.data) fillFromDetail(result.data);
    });
  }

  function handleResetToDefault() {
    if (window.confirm("Are you sure you want to discard all custom changes and reset this template to the default design?")) {
      deleteMutation.mutate(undefined, {
        onSuccess: (updatedDetail) => {
          loadedRef.current = null;
          fillFromDetail(updatedDetail);
        },
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" className="rounded-full" asChild>
          <Link to="/email-templates">← Templates</Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-light tracking-tight sm:text-4xl">
            {detail.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
        </div>
        <Badge variant={isEnabled ? "success" : "secondary"}>
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
        {detail.isCustomized ? (
          <Badge variant="warning">Custom design</Badge>
        ) : (
          <Badge variant="secondary">Default design</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-xl font-light">Content</CardTitle>
              <div className="flex items-center gap-1.5">
                {detail.isCustomized && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-destructive hover:text-destructive"
                    onClick={handleResetToDefault}
                    disabled={deleteMutation.isPending}
                    title="Discard custom edits and restore default template"
                  >
                    {deleteMutation.isPending ? "Resetting…" : "Reset to default"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={handleReloadSaved}
                  title="Discard unsaved edits and reload what is saved on the server"
                >
                  Reload saved
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!detail.isCustomized && (
              <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                No custom design saved yet — the editor shows the default content with
                editable {"{{variables}}"}. Edit anything to create a custom version, or change
                just the subject and leave the bodies empty.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input
                id="tpl-subject"
                ref={subjectRef}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                onFocus={() => {
                  lastField.current = "subject";
                }}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tpl-html">HTML content (syntax highlighted)</Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={handleFormatHtml}
                    type="button"
                    title="Auto-indent and format HTML code"
                  >
                    Format HTML
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full text-xs"
                    onClick={handleLoadStarter}
                    type="button"
                  >
                    Start from brand skeleton
                  </Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                <CodeMirror
                  ref={cmRef}
                  value={htmlBody}
                  height="380px"
                  minHeight="260px"
                  maxHeight="600px"
                  extensions={[html()]}
                  onChange={(val) => setHtmlBody(val)}
                  onFocus={() => {
                    lastField.current = "html";
                  }}
                  className="font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-text">Plain-text content</Label>
              <textarea
                id="tpl-text"
                ref={textRef}
                value={textBody}
                onChange={(event) => setTextBody(event.target.value)}
                onFocus={() => {
                  lastField.current = "text";
                }}
                rows={8}
                spellCheck={false}
                placeholder="Plain-text alternative with {{variables}}."
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Approved variables — select to insert into the focused field:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allVars.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleInsertVar(name)}
                    className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    title={detail.requiredVars.includes(name) ? "Required" : "Optional"}
                  >
                    {`{{${name}}}`}
                    {detail.requiredVars.includes(name) ? "*" : ""}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                * Required — the template cannot be enabled without these.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">
                  {detail.essential
                    ? "Essential mail — disabling falls back to the default design, never silence."
                    : "Disabled templates fall back to the default design."}
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} aria-label="Template enabled" />
            </div>
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save template"}
              </Button>
            </div>
            {detail.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last updated {formatDateTimeWithTime(detail.updatedAt)}
                {detail.updatedBy ? ` · edited by ${detail.updatedBy}` : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-xl font-light">
                  Preview{" "}
                  <span className="font-sans text-xs font-normal text-muted-foreground">
                    · live
                  </span>
                </CardTitle>
                <div className="flex gap-1 rounded-full border border-border p-1">
                  {(["desktop", "mobile"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewWidth(mode)}
                      aria-pressed={previewWidth === mode}
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                        previewWidth === mode ? "bg-night text-white" : "text-muted-foreground"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-4 pt-0">
              {!livePreview && !serverPreviewError ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Rendering preview with realistic dummy data…
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{livePreview?.subject}</span>
                    {livePreview && (
                      <Badge variant={livePreview.source === "default" ? "secondary" : "warning"}>
                        {livePreview.source === "draft"
                          ? "Live draft"
                          : livePreview.source === "custom"
                            ? "Custom"
                            : "Default"}
                      </Badge>
                    )}
                  </div>
                  {serverPreviewError ? (
                    <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
                      {serverPreviewError}
                    </p>
                  ) : (
                    livePreview && (
                      <>
                        <div
                          className="mx-auto overflow-hidden rounded-xl border border-border bg-white"
                          style={{ maxWidth: previewWidth === "mobile" ? 375 : 600 }}
                        >
                          <iframe
                            title={`Email preview (${previewWidth})`}
                            sandbox=""
                            srcDoc={livePreview.html}
                            className="h-[560px] w-full"
                          />
                  </div>
                  {unknownVars.length > 0 && (
                    <p role="alert" className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-xs text-foreground">
                      Unknown {unknownVars.length === 1 ? "variable" : "variables"}{" "}
                      {unknownVars.map((name) => `{{${name}}}`).join(", ")} —{" "}
                      {unknownVars.length === 1 ? "it renders" : "they render"} empty here and{" "}
                      {unknownVars.length === 1 ? "is" : "are"} rejected on save. Use an approved
                      variable from the list.
                    </p>
                  )}
                        <details className="rounded-xl border border-border p-3">
                          <summary className="cursor-pointer text-sm font-medium">
                            Plain-text alternative
                          </summary>
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                            {livePreview.text}
                          </pre>
                        </details>
                      </>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl font-light">Send test email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Sends the saved template render to one explicitly entered address. Rate-limited
                and audited.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={testTo}
                  onChange={(event) => setTestTo(event.target.value)}
                  placeholder="colleague@hamptworthstays.com"
                  inputMode="email"
                  aria-label="Test recipient"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={testMutation.isPending || !testTo.trim()}
                  onClick={() => testMutation.mutate({ key, to: testTo.trim() })}
                >
                  {testMutation.isPending ? "Sending…" : "Send test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EmailTemplateEditPage;
