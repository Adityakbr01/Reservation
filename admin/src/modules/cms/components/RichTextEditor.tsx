import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  minHeightClass?: string;
  /** Minimal toolbar (bold, italic, underline, link) for inline labels. */
  compact?: boolean;
  disabled?: boolean;
}

function ToolButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 rounded-md", active && "bg-accent text-accent-foreground")}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * WYSIWYG editor for CMS HTML fields (blog content, page sections).
 * Emits sanitized-on-server HTML — the API scrubs scripts/handlers on save.
 */
export function RichTextEditor({ value, onChange, label, minHeightClass, compact = false, disabled = false }: RichTextEditorProps) {
  const [urlMode, setUrlMode] = useState<"link" | "image" | null>(null);
  const [urlValue, setUrlValue] = useState("");

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      Image.configure({ inline: false }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: `tiptap w-full px-3 py-2 text-sm leading-relaxed focus:outline-none ${minHeightClass ?? "min-h-[200px]"} ${compact ? "[&_p]:my-0" : ""}`,
      },
    },
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
  });

  // Keep editor in sync when the form loads/resets externally.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    try {
      const current = editor.getHTML();
      if (value !== current && !editor.isFocused) {
        editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
      }
    } catch {
      // Ignore if editor internals unmounted
    }
  }, [editor, value]);

  if (!editor) return null;

  function applyUrl() {
    const url = urlValue.trim();
    if (!url) {
      setUrlMode(null);
      return;
    }
    if (urlMode === "link") {
      editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else if (urlMode === "image") {
      editor?.chain().focus().setImage({ src: url }).run();
    }
    setUrlValue("");
    setUrlMode(null);
  }

  return (
    <div className={cn("space-y-2", disabled && "opacity-50 pointer-events-none")}>
      {label && <Label>{label}</Label>}
      <div className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-1 focus-within:ring-ring">
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5"
          role="toolbar"
          aria-label="Formatting"
        >
          {!compact && (
            <>
              <ToolButton
                title="Heading 2"
                active={editor.isActive("heading", { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                <Heading2 aria-hidden />
              </ToolButton>
              <ToolButton
                title="Heading 3"
                active={editor.isActive("heading", { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                <Heading3 aria-hidden />
              </ToolButton>
            </>
          )}
          <ToolButton
            title="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold aria-hidden />
          </ToolButton>
          <ToolButton
            title="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic aria-hidden />
          </ToolButton>
          <ToolButton
            title="Underline"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon aria-hidden />
          </ToolButton>
          {!compact && (
            <>
              <ToolButton
                title="Bullet list"
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List aria-hidden />
              </ToolButton>
              <ToolButton
                title="Numbered list"
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered aria-hidden />
              </ToolButton>
              <ToolButton
                title="Quote"
                active={editor.isActive("blockquote")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote aria-hidden />
              </ToolButton>
            </>
          )}
          <ToolButton
            title="Add link"
            active={editor.isActive("link") || urlMode === "link"}
            onClick={() => {
              setUrlMode(urlMode === "link" ? null : "link");
              setUrlValue("");
            }}
          >
            <Link2 aria-hidden />
          </ToolButton>
          {!compact && (
            <ToolButton
              title="Insert image by URL"
              active={urlMode === "image"}
              onClick={() => {
                setUrlMode(urlMode === "image" ? null : "image");
                setUrlValue("");
              }}
            >
              <ImagePlus aria-hidden />
            </ToolButton>
          )}
          <ToolButton
            title="Clear formatting"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            <RemoveFormatting aria-hidden />
          </ToolButton>
          <div className="flex-1" />
          <ToolButton
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 aria-hidden />
          </ToolButton>
          <ToolButton
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 aria-hidden />
          </ToolButton>
        </div>
        {urlMode && (
          <div className="flex items-center gap-2 border-b border-border p-2">
            <Input
              autoFocus
              placeholder={urlMode === "link" ? "https://…" : "Image URL https://…"}
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyUrl();
                }
                if (e.key === "Escape") setUrlMode(null);
              }}
            />
            <Button type="button" size="sm" className="rounded-full" onClick={applyUrl}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setUrlMode(null)}>
              Cancel
            </Button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      <p className="text-xs text-muted-foreground">
        Formatted text is saved as HTML and sanitized on the server.
      </p>
    </div>
  );
}

export default RichTextEditor;
