'use client';

import { useEffect, useState } from 'react';

export default function ShareButtons({ text, title = 'MicroLoan Report' }: { text: string; title?: string }) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text });
    } catch {
      // user cancelled the share sheet — ignore
    }
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {canNativeShare && (
        <button onClick={handleNativeShare} className="btn btn-outline" type="button">
          📤 Share (WhatsApp, Messenger, etc.)
        </button>
      )}
      <button onClick={handleWhatsApp} className="btn btn-outline" type="button">
        🟢 WhatsApp
      </button>
      <button onClick={handleCopy} className="btn btn-outline" type="button">
        {copied ? '✅ Copied' : '📋 Copy Text'}
      </button>
    </div>
  );
}
