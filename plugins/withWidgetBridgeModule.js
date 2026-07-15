/**
 * Expo config plugin — copies the hand-written WidgetBridge native module
 * (native/ios/WidgetBridge/*) into the generated iOS project and registers
 * it as a source file on the MAIN app target only (never the QuotesWidget
 * extension target, which can't use RCTBridgeModule).
 *
 * The widget extension target itself is wired separately by
 * @bacons/apple-targets via targets/quotes-widget/expo-target.config.js.
 */
const { withDangerousMod, withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'native', 'ios', 'WidgetBridge');
const FILES = ['WidgetBridgeModule.swift', 'WidgetBridgeModule.m'];

module.exports = function withWidgetBridgeModule(config) {
  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      const destDir = path.join(mod.modRequest.platformProjectRoot, mod.modRequest.projectName, 'WidgetBridge');
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of FILES) {
        fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(destDir, file));
      }
      return mod;
    },
  ]);

  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const projectName = mod.modRequest.projectName;
    const applicationTarget = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });

    for (const file of FILES) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: `${projectName}/WidgetBridge/${file}`,
        groupName: projectName,
        project,
        targetUuid: applicationTarget.uuid,
      });
    }

    return mod;
  });
};
