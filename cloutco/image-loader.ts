// `next/image` with `unoptimized: true` emits its `src` verbatim — basePath is
// never applied — so on a project site every /images/* would 404. A custom
// loader is the only hook that still runs in a static export, so the prefix is
// applied here. Width and quality are ignored: these are plain files in
// /public, served at their natural size, exactly as `unoptimized` did.
type ImageLoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

export default function imageLoader({ src }: ImageLoaderArgs): string {
  // Must match the normalisation in next.config.ts.
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const basePath = raw === "/" ? "" : raw;

  // Absolute URLs are already complete.
  if (/^https?:\/\//.test(src)) {
    return src;
  }

  return `${basePath}${src}`;
}
