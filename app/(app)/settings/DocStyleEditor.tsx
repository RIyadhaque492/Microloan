'use client';

import { useState } from 'react';

type Style = { bold: boolean; italic: boolean; size: 'sm' | 'md' | 'lg'; color: string; align: 'left' | 'center' | 'right' };

const DEFAULT_HEADER: Style = { bold: true, italic: false, size: 'md', color: '#0F2A3F', align: 'left' };
const DEFAULT_FOOTER: Style = { bold: false, italic: false, size: 'md', color: '#3C4650', align: 'center' };

function parse(json: string | null | undefined) {
  try {
    const o = json ? JSON.parse(json) : {};
    return { header: { ...DEFAULT_HEADER, ...(o.header || {}) } as Style, footer: { ...DEFAULT_FOOTER, ...(o.footer || {}) } as Style };
  } catch {
    return { header: DEFAULT_HEADER, footer: DEFAULT_FOOTER };
  }
}

const PX = { header: { sm: 15, md: 19, lg: 25 }, footer: { sm: 11, md: 13, lg: 16 } };

function Toolbar({ value, onChange }: { value: Style; onChange: (s: Style) => void }) {
  const btn = (active: boolean) => `h-9 min-w-[36px] px-2 rounded-lg border text-sm ${active ? 'bg-navy text-white border-navy' : 'bg-white text-gray-700 border-gray-300'}`;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 p-1.5">
      <button type="button" className={btn(value.bold) + ' font-bold'} onClick={() => onChange({ ...value, bold: !value.bold })} aria-label="Bold">B</button>
      <button type="button" className={btn(value.italic) + ' italic'} onClick={() => onChange({ ...value, italic: !value.italic })} aria-label="Italic">I</button>
      <select value={value.size} onChange={(e) => onChange({ ...value, size: e.target.value as Style['size'] })} className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm" aria-label="Size">
        <option value="sm">Small</option>
        <option value="md">Medium</option>
        <option value="lg">Large</option>
      </select>
      <input type="color" value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })} className="h-9 w-10 rounded-lg border border-gray-300 bg-white p-0.5" aria-label="Text colour" />
      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button key={a} type="button" onClick={() => onChange({ ...value, align: a })} className={`h-9 px-2.5 text-sm ${value.align === a ? 'bg-navy text-white' : 'bg-white text-gray-700'}`} aria-label={`Align ${a}`}>
            {a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}
          </button>
        ))}
      </div>
    </div>
  );
}

function previewStyle(st: Style, kind: 'header' | 'footer'): React.CSSProperties {
  return { fontWeight: st.bold ? 700 : 400, fontStyle: st.italic ? 'italic' : 'normal', color: st.color, textAlign: st.align, fontSize: PX[kind][st.size] };
}

/** Header text + footer lines, each with a small text-edit toolbar (bold, italic, size, colour, alignment). */
export default function DocStyleEditor({
  initialHeader, initialAddress, initialContact, initialEmail, initialStyle, logoSrc,
}: {
  initialHeader: string; initialAddress: string; initialContact: string; initialEmail: string; initialStyle: string | null; logoSrc: string;
}) {
  const init = parse(initialStyle);
  const [header, setHeader] = useState(initialHeader);
  const [address, setAddress] = useState(initialAddress);
  const [contact, setContact] = useState(initialContact);
  const [email, setEmail] = useState(initialEmail);
  const [hs, setHs] = useState<Style>(init.header);
  const [fs, setFs] = useState<Style>(init.footer);

  return (
    <div className="space-y-4">
      <input type="hidden" name="doc_style" value={JSON.stringify({ header: hs, footer: fs })} />

      <div>
        <label className="label">Header Text</label>
        <input name="doc_header_text" value={header} onChange={(e) => setHeader(e.target.value)} className="input" placeholder="e.g. Your Company Name" maxLength={200} />
        <div className="mt-2"><Toolbar value={hs} onChange={setHs} /></div>
      </div>

      <div>
        <label className="label">Footer — Address</label>
        <input name="doc_footer_address" value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="e.g. House 1, Road 2, Chattogram" />
      </div>
      <div>
        <label className="label">Footer — Contact</label>
        <input name="doc_footer_contact" value={contact} onChange={(e) => setContact(e.target.value)} className="input" placeholder="e.g. +880 1XXX-XXXXXX" />
      </div>
      <div>
        <label className="label">Footer — Email</label>
        <input name="doc_footer_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="e.g. info@example.com" />
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-1">Footer text style (applies to address, contact and email)</div>
        <Toolbar value={fs} onChange={setFs} />
      </div>

      {/* Live preview */}
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-3">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Preview</div>
        <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: hs.color }}>
          {logoSrc && <img src={logoSrc} alt="" className="h-9 w-auto max-w-[90px] object-contain" />}
          <div className="flex-1" style={previewStyle(hs, 'header')}>{header || 'Header text'}</div>
        </div>
        <div className="h-10 flex items-center justify-center text-xs text-gray-300">— report / receipt content —</div>
        <div className="pt-1.5 border-t" style={{ borderColor: hs.color, ...previewStyle(fs, 'footer') }}>
          {address && <div>{address}</div>}
          {contact && <div>{contact}</div>}
          {email && <div>{email}</div>}
          {!address && !contact && !email && <div className="text-gray-300">Footer address, contact, email</div>}
        </div>
      </div>
    </div>
  );
}
