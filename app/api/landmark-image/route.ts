import { getLandmarkImage } from "../../../lib/landmark-images";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name) {
    return new Response("Missing name", { status: 400 });
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
