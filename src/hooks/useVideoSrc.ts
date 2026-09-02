import { useEffect, useState } from "react";
import { IS_NGROK, NGROK_HEADERS, VIDEO_URL } from "../lib/config";

/**
 * Resolves a URL usable as <video src>.
 *
 * - Local backend: use the endpoint directly (supports Range -> seek).
 * - ngrok free tier: the interstitial page breaks a plain <video src>,
 *   so fetch the file once with the skip header and hand back a blob URL.
 *   (Trade-off: the whole video is held in memory. Fine for the demo clip.)
 */
// changes on every page load -> defeats any stale <video> cache after a swap
const CACHE_BUST = `?v=${Date.now()}`;

export function useVideoSrc(): { src: string | null; error: string | null } {
  const [src, setSrc] = useState<string | null>(
    IS_NGROK ? null : VIDEO_URL + CACHE_BUST,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!IS_NGROK) return;

    let revoked: string | null = null;
    let cancelled = false;

    fetch(VIDEO_URL + CACHE_BUST, { headers: NGROK_HEADERS })
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
  }, []);

  return { src, error };
}
