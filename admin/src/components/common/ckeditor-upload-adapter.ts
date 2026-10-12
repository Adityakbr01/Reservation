import { FileRepository, Plugin } from "ckeditor5";
import type { FileLoader } from "ckeditor5";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

/** Folder uploads from the rich-text image button land in (Media library). */
let uploadFolder = "ckeditor";

export function setMediaUploadFolder(folder: string): void {
  uploadFolder = folder;
}

/** Uploads editor images through the existing admin media API. */
class MediaLibraryUploadAdapter {
  private readonly loader: FileLoader;

  constructor(loader: FileLoader) {
    this.loader = loader;
  }

  upload(): Promise<{ default: string }> {
    return this.loader.file.then(
      (file): Promise<{ default: string }> =>
        new Promise<{ default: string }>((resolve, reject) => {
          if (!file) {
            reject(new Error("No file selected"));
            return;
          }
          const form = new FormData();
          form.append("files", file);
          form.append("folder", uploadFolder);
          apiClient
            .post<ApiEnvelope<Array<{ url: string }>>>("/admin/media", form, {
              headers: { "Content-Type": "multipart/form-data" },
            })
            .then((response) => {
              const url = unwrapResponse(response)[0]?.url;
              if (url) resolve({ default: url });
              else reject(new Error("Upload failed"));
            })
            .catch((error: unknown) => {
              reject(error instanceof Error ? error : new Error("Upload failed"));
            });
        }),
    );
  }

  abort(): void {
    // Single-shot axios POST — nothing cancellable to clean up.
  }
}

/** Wires CKEditor's image button to the Media library (replaces base64 embeds). */
export class MediaUploadAdapterPlugin extends Plugin {
  public static get pluginName(): string {
    return "MediaUploadAdapter";
  }

  public init(): void {
    const repository = this.editor.plugins.get(FileRepository);
    repository.createUploadAdapter = (loader: FileLoader) =>
      new MediaLibraryUploadAdapter(loader);
  }
}
