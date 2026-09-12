/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Document uploads go through a Server Action as base64, so this needs
      // headroom above the 3MB file-size cap enforced in lib/actions.ts
      // (base64 adds ~33% overhead, plus other form fields).
      bodySizeLimit: '5mb',
    },
  },
};

module.exports = nextConfig;
