import { useEffect, useState } from "react";
import { IS_NGROK, NGROK_HEADERS, videoUrl } from "../lib/config";
import { useCameras } from "../state/cameras";

/**
 * Resolves a URL usable as <video src>.
 *
 * - Local backend: use the endpoint directly (supports Range -> seek).
 * - ngrok free tier: the interstitial page breaks a plain <video src>,
 *   so fetch the file once with the skip header and hand back a blob URL.
 *   (Trade-off: the whole video is held in memory. Fine for the demo clip.)
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

    if (!IS_NGROK) {
      setSrc(videoUrl(camera) + `&v=${CACHE_BUST}`);
      return;
    }

    let revoked: string | null = null;
    let cancelled = false;

    fetch(videoUrl(camera) + `&v=${CACHE_BUST}`, { headers: NGROK_HEADERS })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setSrc(url);
      })
      .catch((e) => !cancelled && setError(String(e)));

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [camera]);

  return { src, error };
}
