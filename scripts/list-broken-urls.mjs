import { landmarkImages } from "../lib/landmark-images.ts";

const broken = [];
const ok = [];

for (const [name, image] of Object.entries(landmarkImages)) {
  try {
    const response = await fetch(image.url, {
      method: "HEAD",
      headers: { "User-Agent": "WorldTravelCommittee/1.0 (audit)" },
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) ok.push(name);
    else broken.push({ name, status: response.status });
  } catch (error) {
    broken.push({ name, status: String(error) });
  }
  await new Promise((resolve) => setTimeout(resolve, 600));
}

console.log("OK:", ok.length);
console.log("Broken:", broken.length);
for (const item of broken) console.log(item.name, item.status);
