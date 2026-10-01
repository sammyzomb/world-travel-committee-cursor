import manifestJson from "../data/landmark-static-manifest.json";

export type LandmarkManifestEntry = {
  path?: string;
  sourceUrl: string;
  credit: string;
  bytes?: number;
  downloadUrl?: string;
  license?: string;
  licenseUrl?: string;
  imageReviewedAt?: string;
  failed?: boolean;
  provider?: string;
  lastError?: string;
  rejectedPhotoIds?: string[];
  imageRejected?: boolean;
};

export const landmarkStaticManifest: {
  version: number;
  generatedAt: string | null;
  entries: Record<string, LandmarkManifestEntry>;
} = manifestJson;
