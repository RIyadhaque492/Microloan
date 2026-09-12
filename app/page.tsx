import Link from 'next/link';
import { getSiteSettings } from '@/lib/data';

// Without this, Next.js tries to statically pre-render this page at BUILD time
// (since it has no cookies/searchParams to signal otherwise) — which would both
// break the build (no real database available then) and freeze the homepage's
// content to whatever it was at deploy time, ignoring later Settings changes.
export const dynamic = 'force-dynamic';

export default async function PublicHomePage() {
  const settings = await getSiteSettings();

  const siteName = settings?.site_name || 'MicroLoan';
  const tagline = settings?.tagline || '';
  const bannerHeading = settings?.banner_heading || `Welcome to ${siteName}`;
  const bannerSubtext = settings?.banner_subtext || '';
  const aboutText = settings?.about_text || '';
  const phone = settings?.contact_phone || '';
  const email = settings?.contact_email || '';
  const address = settings?.contact_address || '';

  const mapSrc = address ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null;

  const features = [
    { icon: '⚡', title: 'Fast Approval', text: 'Simple application process with quick decisions, so you get funds when you need them.' },
    { icon: '📅', title: 'Flexible Repayment', text: 'Choose daily, weekly, or monthly installments that fit your income cycle.' },
    { icon: '🤝', title: 'Transparent Terms', text: 'Clear interest and repayment schedule up front — no hidden fees.' },
    { icon: '🛡️', title: 'Trusted Service', text: 'A dedicated team that understands the needs of local businesses and families.' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* Navbar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="font-extrabold text-lg text-navy flex items-center gap-2">💰 {siteName}</div>
          <Link href="/login" className="btn btn-primary">Login</Link>
        </div>
      </header>

      {/* Banner */}
      <section className="bg-gradient-to-br from-navy via-navy to-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 text-center">
          {tagline && <p className="uppercase tracking-wide text-teal-200 text-sm font-semibold mb-3">{tagline}</p>}
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-4 leading-tight">{bannerHeading}</h1>
          {bannerSubtext && <p className="text-teal-50/90 text-base sm:text-lg max-w-2xl mx-auto mb-8">{bannerSubtext}</p>}
          <a href="#contact" className="btn bg-white text-navy hover:bg-gray-100 font-semibold inline-block">📞 Contact Us</a>
        </div>
      </section>

      {/* About / details section */}
      {aboutText && (
        <section className="max-w-4xl mx-auto px-5 py-14 text-center">
          <h2 className="text-2xl font-bold text-navy mb-4">About Us</h2>
          <p className="text-gray-600 leading-relaxed">{aboutText}</p>
        </section>
      )}

      {/* Features */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-2xl font-bold text-navy text-center mb-8">Why Choose Us</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
                <div className="text-3xl mb-2">{f.icon}</div>
                <h3 className="font-bold text-navy mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer with contact + map */}
      <footer id="contact" className="bg-navydark text-gray-300">
        <div className="max-w-6xl mx-auto px-5 py-14 grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Get in Touch</h3>
            <div className="space-y-2 text-sm">
              {phone && <p>📞 {phone}</p>}
              {email && <p>✉️ {email}</p>}
              {address && <p>📍 {address}</p>}
            </div>
            <p className="text-xs text-gray-500 mt-6">© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          </div>
          {mapSrc && (
            <div className="rounded-lg overflow-hidden h-56 md:h-full min-h-[180px] border border-white/10">
              <iframe
                title="Location map"
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
