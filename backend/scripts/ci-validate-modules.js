const fs = require("fs");
const path = require("path");

const SOURCE_DIR = path.join(__dirname, "..", "src");
const TARGET_FOLDERS = ["controllers", "routes", "services"];

const isJavaScriptFile = (fileName) => fileName.endsWith(".js") && !fileName.startsWith(".");

const listJsFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath)
    .filter(isJavaScriptFile)
    .map((fileName) => path.join(dirPath, fileName));
};

const validateModule = (filePath) => {
  try {
    require(filePath);
    return null;
  } catch (error) {
    return `${filePath}: ${error.message}`;
  }
};

const run = () => {
  const files = TARGET_FOLDERS.flatMap((folder) => {
    const folderPath = path.join(SOURCE_DIR, folder);
    return listJsFiles(folderPath);
  });

  if (files.length === 0) {
    console.log("No controller/route/service files present. Skipping module validation.");
    return;
  }

  const errors = files.map(validateModule).filter(Boolean);

  if (errors.length > 0) {
    console.error("Module validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Module validation passed for ${files.length} files.`);
};

run();