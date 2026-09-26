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
  },
};

module.exports = nextConfig;
