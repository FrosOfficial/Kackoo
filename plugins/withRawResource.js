const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const withRawResource = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      const assetsDir = path.join(projectRoot, "assets");
      const rawDir = path.join(projectRoot, "android/app/src/main/res/raw");

      // Ensure directory exists
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true });
      }

      // Copy all .wav files in assets/
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        for (const file of files) {
          if (file.endsWith(".wav")) {
            const src = path.join(assetsDir, file);
            const dest = path.join(rawDir, file);
            fs.copyFileSync(src, dest);
            console.log(`Copied ${file} to Android resources folder successfully.`);
          }
        }
      } else {
        console.warn("Assets directory not found at path:", assetsDir);
      }

      return config;
    },
  ]);
};

module.exports = withRawResource;
