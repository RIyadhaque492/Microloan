'use client';

import { useEffect, useState } from 'react';

/** Shows a PDF as page images fitted to the screen (a one-page PDF is shown whole at 100% fit,
 *  no zooming or scrolling needed). Falls back to the browser's PDF viewer if rendering fails. */
export default function PdfPageViewer({ url }: { url: string }) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

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
          const viewport = page.getViewport({ scale: 2.2 });
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

  if (pages.length === 1) {
    return (
      <div className="h-full w-full bg-gray-200 flex items-center justify-center p-2">
        <img src={pages[0]} alt="PDF page" className="max-h-full max-w-full object-contain shadow-lg bg-white" />
      </div>
    );
  }
  return (
    <div className="h-full w-full bg-gray-200 overflow-auto p-2 space-y-2">
      {pages.map((src, i) => (
        <img key={i} src={src} alt={`Page ${i + 1}`} className="w-full h-auto shadow-lg bg-white mx-auto max-w-4xl" />
      ))}
    </div>
  );
}
