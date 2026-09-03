import type { NextConfig } from "next";

// GitHub Pages serves a project site from a subpath (/FindMyCreator), so the
// build needs a basePath there and none anywhere else. The deploy workflow sets
// NEXT_PUBLIC_BASE_PATH; `next dev` and a plain `next build` leave it unset.
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// configure-pages reports "/" for a user or org site; Next rejects that literally.
const basePath = rawBasePath === "/" ? "" : rawBasePath;

const nextConfig: NextConfig = {
  // Static HTML export — no Node server on Pages.
  output: "export",
  basePath,
  // Every trailing-slash URL resolves to a directory index, which is what
  // Pages serves without a router.
  trailingSlash: true,
  // The Image Optimization API needs a running server. A custom loader — rather
  // than `unoptimized` — is what lets a static export keep the basePath on
  // every image src. See image-loader.ts.
  images: { loader: "custom", loaderFile: "./image-loader.ts" },
};

export default nextConfig;
