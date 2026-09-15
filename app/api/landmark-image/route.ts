import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import landmarkStaticManifest from "../../../data/landmark-static-manifest.json";
import { getLandmarkImage } from "../../../lib/landmark-images";

const publicRoot = resolve(process.cwd(), "public");

function contentTypeForPath(filePath: string) {
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name) {
    return new Response("Missing name", { status: 400 });
  }

  const localEntry = landmarkStaticManifest.entries[name];
  if (localEntry?.path && !localEntry.failed) {
    const filePath = resolve(publicRoot, localEntry.path.replace(/^\//, ""));
    if (existsSync(filePath)) {
      const body = readFileSync(filePath);
      return new Response(body, {
        headers: {
          "Content-Type": contentTypeForPath(filePath),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const image = getLandmarkImage(name);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(image.url, {
    headers: { "User-Agent": "WorldTravelCommittee/1.0 (educational quiz)" },
  });

  if (!upstream.ok) {
    return new Response("Image fetch failed", { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "image/jpeg");
  headers.set("Cache-Control", "public, max-age=604800");

  return new Response(upstream.body, { headers });
}
