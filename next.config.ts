import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Habilita source maps no navegador em produção para depurar erros minificados (Vercel)
  productionBrowserSourceMaps: true,
};

export default nextConfig;
