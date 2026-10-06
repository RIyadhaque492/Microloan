import { getSiteSettings } from '@/lib/data';
import { updateSiteSettingsAction, updateDocumentBrandingAction } from '@/lib/actions';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Website Settings - MicroLoan Admin' };

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const settings = await getSiteSettings();

  return (
    <div>
      <PageHeader title="Website Settings" />

      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2">
          {searchParams.saved === 'doc' ? '✅ Report / Receipt header & footer saved.' : '✅ Settings saved. Your public homepage has been updated.'}
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        This controls the content on your public homepage (the one visitors see before logging in) — banner text, about section, contact details — plus the reference savings interest rate.
      </p>

      <form action={updateSiteSettingsAction} className="card p-6 max-w-2xl space-y-5">
        <div>
          <label className="label">Site / Company Name *</label>
          <input name="site_name" defaultValue={settings?.site_name} required className="input" />
        </div>
        <div>
          <label className="label">Tagline</label>
          <input name="tagline" defaultValue={settings?.tagline} className="input" placeholder="Fast, Fair, and Flexible Micro Loans" />
        </div>

        <h3 className="font-semibold text-sm text-navy pt-2 border-t border-gray-100">Homepage Banner</h3>
        <div>
          <label className="label">Banner Image</label>
          {settings?.banner_image_data ? (
            <div className="mb-2">
              <img src="/api/banner-image" alt="Current banner" className="w-full max-w-md h-32 object-cover rounded-lg border border-gray-200" />
              <label className="flex items-center gap-2 mt-1 text-xs text-red-500">
                <input type="checkbox" name="remove_banner_image" value="1" className="rounded" /> Remove this banner image
              </label>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-2">No banner image uploaded yet — the homepage currently uses a plain color background.</p>
          )}
          <input name="banner_image" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WEBP. Max 3MB. Shown behind the banner heading/subtext on your homepage.</p>
        </div>
        <div>
          <label className="label">Banner Heading</label>
          <input name="banner_heading" defaultValue={settings?.banner_heading} className="input" />
        </div>
        <div>
          <label className="label">Banner Subtext</label>
          <textarea name="banner_subtext" defaultValue={settings?.banner_subtext} className="input" rows={2} />
        </div>
        <div>
          <label className="label">About Section Text</label>
          <textarea name="about_text" defaultValue={settings?.about_text} className="input" rows={4} />
        </div>

        <h3 className="font-semibold text-sm text-navy pt-2 border-t border-gray-100">Contact Details (shown in footer)</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">Phone</label><input name="contact_phone" defaultValue={settings?.contact_phone} className="input" /></div>
          <div><label className="label">Email</label><input name="contact_email" type="email" defaultValue={settings?.contact_email} className="input" /></div>
        </div>
        <div>
          <label className="label">Address</label>
          <textarea name="contact_address" defaultValue={settings?.contact_address} className="input" rows={2} />
          <p className="text-xs text-gray-400 mt-1">This address is also used to show a map on the homepage footer.</p>
        </div>

        <h3 className="font-semibold text-sm text-navy pt-2 border-t border-gray-100">Savings</h3>
        <div>
          <label className="label">Savings Interest Rate (% per annum)</label>
          <input name="savings_interest_rate" type="number" step="0.01" defaultValue={settings?.savings_interest_rate ?? 0} className="input max-w-xs" />
          <p className="text-xs text-gray-400 mt-1">Reference rate shown on member savings pages — update it here anytime, no code change needed.</p>
        </div>

        <button type="submit" className="btn btn-primary">Save Settings</button>
      </form>

      <form id="documents" action={updateDocumentBrandingAction} className="card p-6 max-w-2xl space-y-4 mt-6 scroll-mt-4">
        <div>
          <h3 className="font-semibold text-navy">📄 Report / Receipt Header &amp; Footer</h3>
          <p className="text-xs text-gray-500 mt-1">Used on every report and payment receipt (PDF and Word). Header = logo + text with a line below. Footer = address and contact.</p>
        </div>

        <div>
          <label className="label">Logo</label>
          {settings?.doc_logo_data ? (
            <div className="mb-2 flex items-center gap-3">
              <img src={`data:${settings.doc_logo_mime || 'image/png'};base64,${settings.doc_logo_data}`} alt="Current logo" className="h-14 w-auto rounded border border-gray-200 bg-white p-1" />
              <label className="flex items-center gap-2 text-xs text-red-500">
                <input type="checkbox" name="remove_doc_logo" value="1" className="rounded" /> Remove logo
              </label>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-2">No logo yet.</p>
          )}
          <input name="doc_logo" type="file" accept="image/png,image/jpeg" className="input" />
          <p className="text-xs text-gray-400 mt-1">PNG or JPG, max 1MB. A square or wide logo works best.</p>
        </div>

        <div>
          <label className="label">Header Text</label>
          <input name="doc_header_text" defaultValue={settings?.doc_header_text || ''} className="input" placeholder="e.g. Your Company Name" maxLength={200} />
          <p className="text-xs text-gray-400 mt-1">Shown next to the logo, with a line under it.</p>
        </div>

        <div>
          <label className="label">Footer — Address</label>
          <input name="doc_footer_address" defaultValue={settings?.doc_footer_address || ''} className="input" placeholder="e.g. House 1, Road 2, Chattogram" />
        </div>
        <div>
          <label className="label">Footer — Contact</label>
          <input name="doc_footer_contact" defaultValue={settings?.doc_footer_contact || ''} className="input" placeholder="e.g. +880 1XXX-XXXXXX · info@example.com" />
        </div>

        <button type="submit" className="btn btn-primary">Save Header &amp; Footer</button>
      </form>
    </div>
  );
}
