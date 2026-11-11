import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { IOS_DEPLOYMENT_TARGET, readIdentity } from "./apply-identity.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("app identity", () => {
  const identity = readIdentity();

  it("is the TestFlight id the owner can change in one file", () => {
    assert.equal(identity.displayName, "Tappen");
    assert.equal(identity.bundleId, "app.tappen.ios");
    assert.equal(identity.marketingVersion, "0.1.0");
    assert.equal(identity.targetedDeviceFamily, "1");
    assert.ok(identity.buildNumber >= 1);
  });

  it("matches the Xcode project", () => {
    const pbx = fs.readFileSync(path.join(root, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
    assert.match(pbx, new RegExp(`MARKETING_VERSION = ${identity.marketingVersion};`));
    assert.match(pbx, new RegExp(`CURRENT_PROJECT_VERSION = ${identity.buildNumber};`));
    assert.match(pbx, new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = ${identity.bundleId};`));
    assert.match(pbx, /TARGETED_DEVICE_FAMILY = 1;/);
    assert.doesNotMatch(pbx, /TARGETED_DEVICE_FAMILY = "1,2"/);
    assert.doesNotMatch(pbx, /armv7/);
    assert.equal(IOS_DEPLOYMENT_TARGET, "15.0");
    assert.equal(pbx.match(/IPHONEOS_DEPLOYMENT_TARGET = 15\.0;/g)?.length, 4);
    assert.doesNotMatch(pbx, /IPHONEOS_DEPLOYMENT_TARGET = 14\.0;/);
  });

  it("keeps pods on iOS 15 after pod install", () => {
    const podfile = fs.readFileSync(path.join(root, "ios/App/Podfile"), "utf8");
    assert.match(podfile, /platform :ios, '15\.0'/);
    assert.match(podfile, /assertDeploymentTarget\(installer\)/);
    assert.match(
      podfile,
      /assertDeploymentTarget\(installer\)[\s\S]*IPHONEOS_DEPLOYMENT_TARGET'\] = '15\.0'/,
    );
    assert.doesNotMatch(podfile, /platform :ios, '14\.0'/);
  });

  it("matches the Info.plist release settings", () => {
    const plist = fs.readFileSync(path.join(root, "ios/App/App/Info.plist"), "utf8");
    assert.match(plist, /<key>CFBundleDisplayName<\/key>\s*<string>Tappen<\/string>/);
    assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
    assert.match(plist, /<key>UIStatusBarStyle<\/key>\s*<string>UIStatusBarStyleLightContent<\/string>/);
    assert.match(plist, /<key>UIViewControllerBasedStatusBarAppearance<\/key>\s*<false\/>/);
    assert.match(plist, /<string>UIInterfaceOrientationPortrait<\/string>/);
    assert.doesNotMatch(plist, /Landscape/);
    assert.doesNotMatch(plist, /~ipad/);
    assert.doesNotMatch(plist, /NSAppTransportSecurity/);
    assert.doesNotMatch(plist, /UsageDescription/);
    assert.doesNotMatch(plist, /armv7/);
  });

  it("ships the local bundle instead of a dev server", () => {
    const config = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
    assert.match(config, new RegExp(`appId:\\s*"${identity.bundleId}"`));
    assert.match(config, new RegExp(`appName:\\s*"${identity.displayName}"`));
    assert.doesNotMatch(config, /server\s*:/);
    assert.match(config, /webDir:\s*"dist"/);
  });
});
