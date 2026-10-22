"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useConsole } from "@/state/store";

const CCTV_REFRESH_MS = 30_000;

/**
 * Floating player for live broadcasts (YouTube embed) and CCTV stills. Not a
 * blocking modal: the map stays interactive underneath, OSIRIS-style.
 */
export function MediaViewer() {
  const media = useConsole((s) => s.ui.media);
  const setUi = useConsole((s) => s.setUi);
  const [tick, setTick] = useState(0);

  // CCTV stills update every ~minute upstream; refresh with a cache-busting param.
  useEffect(() => {
    if (media?.kind !== "cctv") return;
    const id = setInterval(() => setTick((t) => t + 1), CCTV_REFRESH_MS);
    return () => clearInterval(id);
  }, [media]);

  if (!media) return null;
  const close = () => setUi({ media: null });

  return (
    <aside
      className="glass fixed right-3 bottom-11 z-40 w-[min(420px,calc(100vw-1.5rem))] shadow-panel lg:right-[395px]"
      aria-label={`${media.kind === "broadcast" ? "Live broadcast" : "Traffic camera"}: ${media.title}`}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="live-dot shrink-0" style={{ background: "var(--accent)", color: "var(--accent)" }} aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{media.title}</h2>
        {media.url && (
          <a href={media.url} target="_blank" rel="noreferrer" className="text-muted hover:text-fg" aria-label="Open source in a new tab">
            <ExternalLink size={14} />
          </a>
        )}
        <button type="button" onClick={close} className="text-muted hover:text-fg" aria-label="Close viewer">
          <X size={15} />
        </button>
      </header>
      <div className="relative aspect-video bg-black">
        {media.kind === "broadcast" ? (
          <iframe
            key={media.itemId}
            src={media.media}
            title={media.title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- TfL CDN still, refreshed in place
          <img src={`${media.media}?t=${tick}`} alt={`Traffic camera: ${media.title}`} className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <p className="telemetry px-3 py-1.5 text-muted">
        {media.facts.join(" · ")}
        {media.kind === "broadcast" && " · offline? open on YouTube ↗"}
      </p>
    </aside>
  );
}
