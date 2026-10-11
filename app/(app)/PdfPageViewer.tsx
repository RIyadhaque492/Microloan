'use client';

import { useEffect, useRef, useState } from 'react';

type Pg = { src: string; w: number; h: number };

/** Shows a PDF as page images. 100% = fitted to the screen (a one-page PDF shows whole, a longer one fits the width).
 *  The + / − buttons zoom in 25% steps, "Fit" always returns to exactly 100% fit. Falls back to the browser's viewer. */
export default function PdfPageViewer({ url }: { url: string }) {
  const [pages, setPages] = useState<Pg[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = 100% = fit
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setFailed(false);
    setZoom(1);
    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const buf = await (await fetch(url)).arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        const out: Pg[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 3 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
          out.push({ src: canvas.toDataURL('image/png'), w: viewport.width, h: viewport.height });
        }
        if (!cancelled) setPages(out);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Track the visible area so "100%" always means exactly fit, whatever the screen size.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pages]);

  if (failed) return <iframe src={`${url}#view=Fit`} title="PDF preview" className="w-full h-full border-0" />;
  if (!pages) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Preparing preview…</div>;

  const pad = 16;
  const availW = Math.max(100, size.w - pad);
  const availH = Math.max(100, size.h - pad);
  const single = pages.length === 1;
  const fitScale = (p: Pg) => (single ? Math.min(availW / p.w, availH / p.h) : availW / p.w);
  const pct = Math.round(zoom * 100);
  const step = (d: number) => setZoom((z) => Math.min(4, Math.max(0.5, Math.round((z + d) * 100) / 100)));

  return (
    <div className="relative h-full w-full bg-gray-200">
      <div className="absolute top-2 right-4 z-10 flex items-center gap-1 rounded-full bg-black/75 text-white px-2 py-1 text-sm shadow">
        <button type="button" onClick={() => step(-0.25)} className="w-8 h-8 rounded-full hover:bg-white/20 text-lg leading-none" aria-label="Zoom out">−</button>
        <span className="w-12 text-center text-xs tabular-nums" data-testid="zoom-pct">{pct}%</span>
        <button type="button" onClick={() => step(0.25)} className="w-8 h-8 rounded-full hover:bg-white/20 text-lg leading-none" aria-label="Zoom in">+</button>
        <button type="button" onClick={() => setZoom(1)} className="ml-1 px-3 h-8 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold" aria-label="Fit to screen (100%)">Fit</button>
      </div>

      <div ref={box} className="h-full w-full overflow-auto" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: pad / 2, width: 'max-content', minWidth: '100%', minHeight: '100%', boxSizing: 'border-box' }}>
          {size.w > 0 &&
            pages.map((p, i) => (
              <img
                key={i}
                src={p.src}
                alt={`Page ${i + 1}`}
                draggable={false}
                className="shadow-lg bg-white flex-shrink-0"
                style={{ width: Math.round(p.w * fitScale(p) * zoom), height: 'auto', maxWidth: 'none' }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
