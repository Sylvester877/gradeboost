import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output lets Electron spawn a production Next.js server locally.
  output: "standalone",
  // These packages contain native/Node-only code or are very large (e.g. ONNX
  // models inside @xenova/transformers). Keep them out of the webpack bundle so
  // the build doesn't hang and Node resolves them at runtime.
  serverExternalPackages: [
    "unpdf",
    "@electric-sql/pglite",
    "drizzle-orm",
  ],
  // Exclude heavy native binaries and unused data from the standalone output.
  // @img/sharp was pulled in by @xenova/transformers (now removed) but the
  // native DLLs still get traced. caniuse-lite has 855 KB of browser compat
  // data that Next.js bundles but is never needed at server runtime.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@img/**",
      "node_modules/sharp/**",
      "node_modules/caniuse-lite/**",
    ],
  },
  experimental: {
    // Force webpack into the main process so heavy computations don't deadlock
    // the build worker pool.
    webpackBuildWorker: false,
  },
  // Externalize Node.js built-ins for server bundles.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(/^node:/);
    }
    return config;
  },
};

export default nextConfig;
