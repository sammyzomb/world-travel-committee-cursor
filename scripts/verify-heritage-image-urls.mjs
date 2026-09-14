import { heritageLandmarkImages } from "../lib/landmark-images-heritage.ts";

const broken = [];
const ok = [];

for (const [name, image] of Object.entries(heritageLandmarkImages)) {
  try {
    const response = await fetch(image.url, {
      method: "HEAD",
      headers: { "User-Agent": "WorldTravelCommittee/1.0 (heritage audit)" },
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok) ok.push(name);
    else broken.push({ name, status: response.status });
  } catch (error) {
    broken.push({ name, status: "error", message: String(error) });
  }
  await new Promise((resolve) => setTimeout(resolve, 350));
}

console.log("Heritage images OK:", ok.length);
console.log("Heritage images broken:", broken.length);
broken.forEach((item) => console.log(item));
