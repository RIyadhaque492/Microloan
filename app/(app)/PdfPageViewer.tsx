'use client';

import { useEffect, useState } from 'react';

/** Shows a PDF as page images. Starts fitted to the screen (whole page visible); the + / − buttons
 *  zoom in for reading small text, and pinch-zoom works too. Falls back to the browser's viewer. */
export default function PdfPageViewer({ url }: { url: string }) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1); // 1 = fit the screen

  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setFailed(false);
    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const buf = await (await fetch(url)).arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        const out: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 3 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
          out.push(canvas.toDataURL('image/png'));
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

  if (failed) return <iframe src={`${url}#view=Fit`} title="PDF preview" className="w-full h-full border-0" />;
  if (!pages) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Preparing preview…</div>;

  const single = pages.length === 1;
  const zoomed = zoom > 1.01;

  return (
    <div className="relative h-full w-full bg-gray-200">
      <div className="absolute top-2 right-3 z-10 flex items-center gap-1 rounded-full bg-black/70 text-white px-2 py-1 text-sm shadow">
        <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} className="w-8 h-8 rounded-full hover:bg-white/20 text-lg leading-none" aria-label="Zoom out">−</button>
        <button type="button" onClick={() => setZoom(1)} className="px-2 text-xs hover:bg-white/20 rounded-full h-8" aria-label="Fit to screen">{zoomed ? `${Math.round(zoom * 100)}%` : 'Fit'}</button>
        <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))} className="w-8 h-8 rounded-full hover:bg-white/20 text-lg leading-none" aria-label="Zoom in">+</button>
      </div>

      <div className={`h-full w-full overflow-auto ${single && !zoomed ? 'flex items-center justify-center p-2' : 'p-2 space-y-2'}`} style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
        {pages.map((src, i) =>
          single && !zoomed ? (
            <img key={i} src={src} alt="PDF page" className="max-h-full max-w-full object-contain shadow-lg bg-white" />
          ) : (
            <img key={i} src={src} alt={`Page ${i + 1}`} className="h-auto shadow-lg bg-white mx-auto max-w-none" style={{ width: `${zoom * 100}%`, maxWidth: zoom > 1 ? 'none' : '56rem' }} />
          )
        )}
      </div>
    </div>
  );
}
