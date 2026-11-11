/**
 * Copies play/native/app.identity.json into the Xcode project.
 * That JSON file is the only place to change the name, bundle id, or versions.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Xcode 27 rejects 14.0. Capacitor's podspec still asks for it; the Podfile overrides pods. */
export const IOS_DEPLOYMENT_TARGET = "15.0";

export function readIdentity(file = path.join(root, "app.identity.json")) {
  const identity = JSON.parse(fs.readFileSync(file, "utf8"));
  if (typeof identity.displayName !== "string" || identity.displayName.trim() === "") {
    throw new Error("displayName must be a non-empty string");
  }
  if (!/^[a-zA-Z0-9.-]+$/.test(identity.bundleId)) {
    throw new Error("bundleId must be a reverse-DNS id");
  }
  if (!/^\d+\.\d+\.\d+$/.test(identity.marketingVersion)) {
    throw new Error("marketingVersion must be major.minor.patch");
  }
  if (!Number.isInteger(identity.buildNumber) || identity.buildNumber < 1) {
    throw new Error("buildNumber must be an integer >= 1");
  }
  if (identity.targetedDeviceFamily !== "1" && identity.targetedDeviceFamily !== "1,2") {
    throw new Error('targetedDeviceFamily must be "1" (iPhone) or "1,2" (iPhone and iPad)');
  }
  return identity;
}

export function withDisplayName(plist, displayName) {
  return plist.replace(
    /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${displayName}$2`,
  );
}

function familySetting(family) {
  return family.includes(",") ? `"${family}"` : family;
}

export function applyIdentity(identity = readIdentity()) {
  const pbxPath = path.join(root, "ios/App/App.xcodeproj/project.pbxproj");
  const plistPath = path.join(root, "ios/App/App/Info.plist");
  const configPath = path.join(root, "capacitor.config.ts");
  const config = fs
    .readFileSync(configPath, "utf8")
    .replace(/appId:\s*"[^"]*"/, `appId: "${identity.bundleId}"`)
    .replace(/appName:\s*"[^"]*"/, `appName: "${identity.displayName}"`);
  fs.writeFileSync(configPath, config);
  let pbx = fs.readFileSync(pbxPath, "utf8");
  pbx = pbx
    .replaceAll(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${identity.marketingVersion};`)
    .replaceAll(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${identity.buildNumber};`)
    .replaceAll(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${identity.bundleId};`)
    .replaceAll(
      /TARGETED_DEVICE_FAMILY = [^;]+;/g,
      `TARGETED_DEVICE_FAMILY = ${familySetting(identity.targetedDeviceFamily)};`,
    )
    .replaceAll(
      /IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g,
      `IPHONEOS_DEPLOYMENT_TARGET = ${IOS_DEPLOYMENT_TARGET};`,
    );
  fs.writeFileSync(pbxPath, pbx);

  const plist = withDisplayName(fs.readFileSync(plistPath, "utf8"), identity.displayName);
  fs.writeFileSync(plistPath, plist);
  return identity;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const identity = applyIdentity();
  console.log(
    `${identity.displayName} ${identity.bundleId} ${identity.marketingVersion} (${identity.buildNumber})`,
  );
}
