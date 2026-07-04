const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const archiveVersion =
  process.env.GITHUB_REF_NAME ?? process.env.npm_package_version ?? "dev";

const sharedFiles = ["TabExtractor.js", "matcher.js", "LICENSE"];
const sharedDirectories = ["icons"];
const packages = [
  { browser: "chrome", manifest: "manifest.json" },
  { browser: "firefox", manifest: "manifest.firefox.json" },
];

const copySharedAssets = (targetDir) => {
  for (const file of sharedFiles) {
    fs.copyFileSync(path.join(rootDir, file), path.join(targetDir, file));
  }
  for (const directory of sharedDirectories) {
    fs.cpSync(path.join(rootDir, directory), path.join(targetDir, directory), {
      recursive: true,
    });
  }
};

const zipPackage = (targetDir, archivePath) => {
  const result = spawnSync("zip", ["-qr", archivePath, "."], {
    cwd: targetDir,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`zip exited with status ${result.status}`);
  }
};

fs.rmSync(distDir, { force: true, recursive: true });
fs.mkdirSync(distDir, { recursive: true });

for (const packageConfig of packages) {
  const targetDir = path.join(distDir, packageConfig.browser);
  const archivePath = path.join(
    distDir,
    `tab-extractor-${packageConfig.browser}-${archiveVersion}.zip`,
  );

  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(
    path.join(rootDir, packageConfig.manifest),
    path.join(targetDir, "manifest.json"),
  );
  copySharedAssets(targetDir);
  zipPackage(targetDir, archivePath);
  console.log(`Packaged ${path.relative(rootDir, archivePath)}`);
}
