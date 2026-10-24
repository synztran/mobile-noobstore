import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { packageManager } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const [major, minor, patch] = process.versions.node.split(".").map(Number);
console.log(`Node.js ${process.version}`);
if (major !== 24 || minor < 22 || (minor === 22 && patch < 1)) {
  console.error("Deployment requires patched Node.js >=24.22.1 <25.");
  process.exit(1);
}

function run(args, capture = false) {
  const result = spawnSync("corepack", ["yarn", ...args], {
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: "utf8",
  });
  if (result.error) {
    console.error("Corepack is required to install the pinned Yarn version.", result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout?.trim();
}

const yarnVersion = run(["--version"], true);
console.log(`Yarn ${yarnVersion}`);
if (`yarn@${yarnVersion}` !== packageManager) {
  console.error(`Expected ${packageManager}; refusing to rewrite the lockfile with another Yarn version.`);
  process.exit(1);
}
run(["install", "--immutable"]);
