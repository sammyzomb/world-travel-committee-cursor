import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig, type PluginOption } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

type CloudflareLocalConfig = {
  d1DatabaseId?: string;
  d1DatabaseName?: string;
  workerName?: string;
};

function readCloudflareLocalConfig(): CloudflareLocalConfig {
  const path = fileURLToPath(new URL("./cloudflare.json", import.meta.url));
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CloudflareLocalConfig;
  } catch {
    return {};
  }
}

const cloudflareLocal = readCloudflareLocalConfig();
const { d1, r2 } = hostingConfig;
const d1DatabaseId =
  cloudflareLocal.d1DatabaseId ??
  process.env.D1_DATABASE_ID ??
  SITE_CREATOR_PLACEHOLDER_DATABASE_ID;
const d1DatabaseName = cloudflareLocal.d1DatabaseName ?? "world-travel-committee-d1";
const workerName = cloudflareLocal.workerName ?? "world-travel-committee";

const isNetlifyBuild =
  process.env.NETLIFY === "true" || process.env.NITRO_PRESET === "netlify";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

const localBindingConfig = {
  name: workerName,
  main: "vinext/server/fetch-handler",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: d1DatabaseName,
          database_id: d1DatabaseId,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  const plugins: PluginOption[] = [vinext()];

  if (isNetlifyBuild) {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    const { nitro } = await import("nitro/vite");
    plugins.push(tailwindcss(), nitro());
  } else {
    process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
    process.env.WRANGLER_SEND_METRICS ??= "false";
    process.env.WRANGLER_WRITE_LOGS ??= "false";
    process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
    process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
    process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

    const { cloudflare } = await import("@cloudflare/vite-plugin");
    plugins.push(
      sites({ mockAuth: !managedLinux }),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    );
  }

  return {
    server: {
      allowedHosts: true,
      host: true,
      hmr: false,
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
    },
    resolve: isNetlifyBuild
      ? undefined
      : {
          alias: {
            [fileURLToPath(new URL("./db/netlify-db-stub.ts", import.meta.url))]:
              fileURLToPath(new URL("./db/cloudflare-db.ts", import.meta.url)),
          },
        },
    plugins,
  };
});
