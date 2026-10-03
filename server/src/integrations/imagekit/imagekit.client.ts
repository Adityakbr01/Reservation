import ImageKit from "imagekit";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";

let cached: ImageKit | null = null;

/**
 * Lazy ImageKit singleton for server-side media operations.
 * The private key never leaves the server; browser uploads (if ever needed)
 * must use backend-generated auth parameters, never the key itself.
 */
export function getImageKit(): ImageKit {
  if (cached) return cached;
  const publicKey = env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new AppError("Media provider is not configured", 503, "MEDIA_NOT_CONFIGURED");
  }
  cached = new ImageKit({ publicKey, privateKey, urlEndpoint });
  return cached;
}
