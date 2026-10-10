import { useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Italic,
  Link,
  LinkImage,
  List,
  Paragraph,
  Underline,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { Label } from "@/components/ui/label";
import {
  MediaUploadAdapterPlugin,
  setMediaUploadFolder,
} from "./ckeditor-upload-adapter";

interface CkEditorFieldProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Image button (uploads to the Media library) + caption/alt toolbar. */
  enableImages?: boolean;
  /** Media library folder for uploads from this field. */
  uploadFolder?: string;
}

/**
 * CKEditor 5 rich-text field (Wireless… why-book bodies, hamper
 * descriptions, anywhere admins need formatted body copy).
 * Output HTML is sanitized again on the server before storage.
 */
export function CkEditorField({
  label,
  value,
  onChange,
  placeholder,
  enableImages = false,
  uploadFolder = "ckeditor",
}: CkEditorFieldProps) {
  const current = useRef(value);
  current.current = value;
  if (enableImages) setMediaUploadFolder(uploadFolder);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="overflow-hidden rounded-md border border-input bg-background [&_.ck-editor__editable]:min-h-28 [&_.ck-editor__editable]:bg-background [&_.ck-content]:px-3 [&_.ck-content]:text-sm">
        <CKEditor
          editor={ClassicEditor}
          data={value}
          config={{
            licenseKey: "GPL",
            placeholder: placeholder ?? "Write something…",
            plugins: [
              Essentials,
              Paragraph,
              Heading,
              Bold,
              Italic,
              Underline,
              Link,
              List,
              BlockQuote,
              ...(enableImages
                ? [
                    Image,
                    ImageToolbar,
                    ImageCaption,
                    ImageStyle,
                    ImageUpload,
                    LinkImage,
                    MediaUploadAdapterPlugin,
                  ]
                : []),
            ],
            toolbar: [
              "heading",
              "|",
              "bold",
              "italic",
              "underline",
              "link",
              ...(enableImages ? ["uploadImage"] : []),
              "|",
              "bulletedList",
              "numberedList",
              "blockQuote",
              "|",
              "undo",
              "redo",
            ],
            ...(enableImages
              ? {
                  image: {
                    toolbar: [
                      "imageTextAlternative",
                      "toggleImageCaption",
                      "linkImage",
                    ],
                  },
                }
              : {}),
          }}
          onChange={(_event, editor) => {
            const html = editor.getData();
            if (html !== current.current) onChange(html);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {enableImages
          ? "Headings, lists, links and images supported. Images upload to the Media library. Saved as HTML and sanitized on the server."
          : "Formatted text is saved as HTML and sanitized on the server."}
      </p>
    </div>
  );
}

export default CkEditorField;
