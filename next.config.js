/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Kept comfortably under Vercel's own ~4.5MB hard request-body limit for
    // serverless functions — a Next.js limit ABOVE that platform ceiling doesn't
    // actually allow bigger uploads, it just means large ones get killed by the
    // platform with a raw, unhandled "Application error" instead of the friendly
    // validation message our own file-size checks would otherwise show.
    serverActions: {
      bodySizeLimit: '4mb',
    },
    // The App Router's client-side Router Cache otherwise keeps a page's data
    // around for up to 30s after visiting it, even on a "dynamic" route — so
    // after adding/removing/editing something and getting redirected back to a
    // list (e.g. Collect Payment -> Loan Collection, or removing a loan/member
    // to the Bin), the list could still show the OLD data for a little while,
    // looking to a member/admin like the change "didn't work" until they
    // manually reloaded. Setting both staleTimes to 0 makes every navigation
    // re-fetch fresh data from the server instead.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

nextConfig.webpack = (config) => {
  // pdf.js tries to load the optional Node-only 'canvas' package; the browser doesn't need it.
  config.resolve.alias.canvas = false;
  return config;
};

module.exports = nextConfig;
