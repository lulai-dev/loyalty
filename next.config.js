/** @type {import('next').NextConfig} */
const nextConfig = {
  // passkit-generator usa APIs de Node que no deben empaquetarse
  experimental: {
    serverComponentsExternalPackages: ["passkit-generator"],
  },
};

module.exports = nextConfig;
