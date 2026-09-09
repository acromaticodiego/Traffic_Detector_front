import { useEffect, useState } from "react";
import { videoUrl } from "../lib/config";
import { apiHeaders } from "../lib/session";
import { useCameras } from "../state/cameras";

/**
 * Resolves a URL usable as <video src>.
 *
 * The clip is always fetched with the session headers and handed back as a
 * blob URL, never pointed at directly. A <video src> issues its own request
 * and the element cannot set an Authorization header, so now that the stream
 * endpoint requires a permission that request comes back 401 and nothing
 * plays. It is the same reason the evidence images are fetched instead of
 * pointed at. The ngrok interstitial, which was the original reason for this
 * detour, is skipped by the same headers.
 *
 * The trade-off is that the clip downloads whole before it plays and is held
 * in memory, so Range-based streaming is lost — seeking still works, since a
 * fully buffered blob seeks instantly, and the demo clip is small. A long
 * recording would want a short-lived token in the URL instead, the way the
 * inference socket does it.
 */
// changes on every page load -> defeats any stale <video> cache after a swap
const CACHE_BUST = Date.now();

export function useVideoSrc(): { src: string | null; error: string | null } {
  const camera = useCameras((s) => s.selectedId);

  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nothing to play until the registry says which camera we are watching.
    if (!camera) {
      setSrc(null);
      return;
    }

    setError(null);
    setSrc(null);

    let revoked: string | null = null;
    let cancelled = false;

    fetch(videoUrl(camera) + `&v=${CACHE_BUST}`, { headers: apiHeaders() })
      .then((r) => {
        // A rejected session is worth naming: "HTTP 401" on the video panel
        // reads like a broken backend when it only means the session expired.
        if (r.status === 401 || r.status === 403) {
          throw new Error("Tu sesión no permite ver el vídeo de esta cámara.");
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setSrc(url);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [camera]);

  return { src, error };
}
