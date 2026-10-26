import tls from 'tls';

/** Minimal dependency-free SMTP sender (implicit TLS, port 465 — what Gmail uses) that can attach one file. */
export type MailOptions = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  filename: string;
  mime: string;
  data: Buffer;
};

const noBreaks = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();
const b64 = (b: Buffer | string) => Buffer.from(b as any).toString('base64');
const wrap76 = (s: string) => s.replace(/(.{76})/g, '$1\r\n');

export function buildMessage(o: MailOptions): string {
  const boundary = '=_ml_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const subject = `=?UTF-8?B?${b64(noBreaks(o.subject))}?=`;
  const fname = noBreaks(o.filename).replace(/"/g, '');
  return [
    `From: ${noBreaks(o.from)}`,
    `To: ${noBreaks(o.to)}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(o.text)),
    `--${boundary}`,
    `Content-Type: ${o.mime}; name="${fname}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${fname}"`,
    '',
    wrap76(b64(o.data)),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export function sendMail(o: MailOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: o.host, port: o.port, servername: o.host });
    let buf = '';
    let waiter: ((code: number, text: string) => void) | null = null;
    let settled = false;
    const fail = (e: any) => { if (!settled) { settled = true; try { socket.destroy(); } catch {} reject(e instanceof Error ? e : new Error(String(e))); } };
    const timer = setTimeout(() => fail(new Error('Mail server timed out.')), 25000);

    socket.setEncoding('utf8');
    socket.on('error', fail);
    socket.on('close', () => fail(new Error('Mail server closed the connection.')));
    socket.on('data', (chunk: string) => {
      buf += chunk;
      // a reply is complete when its last line is "NNN text" (not "NNN-text")
      const lines = buf.split('\r\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const m = /^(\d{3})([ -])(.*)$/.exec(line);
        if (m && m[2] === ' ' && waiter) { const w = waiter; waiter = null; w(Number(m[1]), line); }
      }
    });

    const expect = (ok: number[]) => new Promise<void>((res, rej) => {
      waiter = (code, text) => (ok.includes(code) ? res() : rej(new Error(`Mail server said: ${text}`)));
    });
    const send = async (line: string, ok: number[]) => { const p = expect(ok); socket.write(line + '\r\n'); await p; };

    (async () => {
      const greeting = expect([220]);
      await greeting;
      await send('EHLO microloan', [250]);
      await send('AUTH LOGIN', [334]);
      await send(b64(o.user), [334]);
      await send(b64(o.pass), [235]);
      await send(`MAIL FROM:<${noBreaks(o.user)}>`, [250]);
      await send(`RCPT TO:<${noBreaks(o.to)}>`, [250, 251]);
      await send('DATA', [354]);
      const body = buildMessage(o).replace(/\r\n\./g, '\r\n..');
      await send(body + '\r\n.', [250]);
      try { socket.write('QUIT\r\n'); } catch {}
      settled = true;
      clearTimeout(timer);
      socket.end();
      resolve();
    })().catch((e) => { clearTimeout(timer); fail(e); });
  });
}
