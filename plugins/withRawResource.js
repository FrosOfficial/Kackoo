const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withRawResource = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      const sourceFile = path.join(projectRoot, "assets/alarm.wav");
      const rawDir = path.join(projectRoot, "android/app/src/main/res/raw");
      const destFile = path.join(rawDir, "alarm.wav");

      // Ensure directory exists
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }

      // Copy file if source exists
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile);
        console.log("Copied alarm.wav to Android resources folder successfully.");
      } else {
        console.warn("Source alarm.wav not found at path:", sourceFile);
      }

      return config;
    },
  ]);
};

module.exports = withRawResource;
