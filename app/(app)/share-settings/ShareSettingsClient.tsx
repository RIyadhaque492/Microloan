'use client';

import { useEffect, useState } from 'react';

type Msg = { ok: boolean; text: string } | null;

async function call(method: 'GET' | 'POST', body?: any) {
  const res = await fetch('/api/share-settings', { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export default function ShareSettingsClient() {
  const [loaded, setLoaded] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [hasPass, setHasPass] = useState(false);
  const [smtpPass, setSmtpPass] = useState('');
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState('');
  const [tgMsg, setTgMsg] = useState<Msg>(null);
  const [mailMsg, setMailMsg] = useState<Msg>(null);

  async function load() {
    try {
      const s = await call('GET');
      setHasToken(s.telegram.hasToken); setChatId(s.telegram.chatId || '');
      setSmtpUser(s.email.user || ''); setHasPass(s.email.hasPass);
    } catch (e: any) {
      setTgMsg({ ok: false, text: e.message });
    }
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  async function run(name: string, fn: () => Promise<void>, set: (m: Msg) => void) {
    setBusy(name); set(null);
    try { await fn(); } catch (e: any) { set({ ok: false, text: e.message }); }
    setBusy('');
  }

  const saveBody = () => ({ action: 'save', telegram_bot_token: token, telegram_chat_id: chatId, smtp_user: smtpUser, smtp_pass: smtpPass });

  return (
    <div className="space-y-5 max-w-3xl">
      <section className="card p-5 border-l-4 border-l-sky-500">
        <h2 className="font-bold text-navy mb-1">✈️ Telegram — send PDFs straight into Telegram</h2>
        <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-0.5 mb-4">
          <li>In Telegram search <strong>@BotFather</strong> → send <code>/newbot</code> → give it a name → copy the <strong>token</strong> it gives you.</li>
          <li>Paste the token below. Then open your new bot in Telegram, press <strong>Start</strong> and send it “hi”.</li>
          <li>Click <strong>Find my Chat ID</strong>, pick your chat, then <strong>Save</strong> and <strong>Send test message</strong>.</li>
        </ol>
        <label className="label">Bot token {hasToken && <span className="text-green-600 font-normal">✓ saved</span>}</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder={hasToken ? 'Saved — paste a new one only to change it' : '123456789:ABC-DEF…'} className="input mb-3" autoComplete="off" />
        <label className="label">Chat ID</label>
        <div className="flex gap-2 flex-wrap mb-2">
          <input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="e.g. 123456789" className="input max-w-xs" />
          <button type="button" className="btn btn-outline" disabled={!!busy || (!token && !hasToken)}
            onClick={() => run('detect', async () => {
              const r = await call('POST', { action: 'detect', token });
              setChats(r.chats);
              if (r.chats.length === 1) setChatId(r.chats[0].id);
              setTgMsg({ ok: true, text: r.chats.length === 1 ? `Found: ${r.chats[0].name} (${r.chats[0].id}). Now click Save.` : 'Pick your chat from the list below.' });
            }, setTgMsg)}>
            {busy === 'detect' ? 'Looking…' : '🔎 Find my Chat ID'}
          </button>
        </div>
        {chats.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {chats.map((c) => <button key={c.id} type="button" className="btn btn-outline !py-1 text-xs" onClick={() => setChatId(c.id)}>{c.name} · {c.id}</button>)}
          </div>
        )}
        <div className="flex gap-2 flex-wrap mt-3">
          <button type="button" className="btn btn-primary" disabled={!!busy}
            onClick={() => run('save-tg', async () => { await call('POST', saveBody()); setToken(''); await load(); setTgMsg({ ok: true, text: 'Saved.' }); }, setTgMsg)}>
            {busy === 'save-tg' ? 'Saving…' : '💾 Save'}
          </button>
          <button type="button" className="btn btn-outline" disabled={!!busy}
            onClick={() => run('test', async () => { await call('POST', saveBody()); setToken(''); await call('POST', { action: 'test' }); await load(); setTgMsg({ ok: true, text: '✅ Test message sent — check Telegram.' }); }, setTgMsg)}>
            {busy === 'test' ? 'Sending…' : '📨 Send test message'}
          </button>
        </div>
        {tgMsg && <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${tgMsg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{tgMsg.text}</div>}
      </section>

      <section className="card p-5 border-l-4 border-l-red-400">
        <h2 className="font-bold text-navy mb-1">✉️ Email (Gmail) — send PDFs as an attachment</h2>
        <p className="text-sm text-gray-600 mb-3">Use a Gmail <strong>App password</strong>: Google Account → Security → 2-Step Verification (turn on) → App passwords → create one (16 letters). Your normal password will not work.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="label">Gmail address</label><input type="email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="yourname@gmail.com" className="input" /></div>
          <div><label className="label">App password {hasPass && <span className="text-green-600 font-normal">✓ saved</span>}</label><input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder={hasPass ? 'Saved — type only to change' : 'abcd efgh ijkl mnop'} className="input" autoComplete="new-password" /></div>
        </div>
        <button type="button" className="btn btn-primary mt-3" disabled={!!busy}
          onClick={() => run('save-mail', async () => { await call('POST', saveBody()); setSmtpPass(''); await load(); setMailMsg({ ok: true, text: 'Saved. Use Share → Gmail on any report or receipt to try it.' }); }, setMailMsg)}>
          {busy === 'save-mail' ? 'Saving…' : '💾 Save'}
        </button>
        {mailMsg && <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${mailMsg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{mailMsg.text}</div>}
      </section>

      {!loaded && <div className="text-sm text-gray-400">Loading…</div>}
    </div>
  );
}
