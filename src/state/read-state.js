let fs = require("fs");
let os = require("os");

const stateFilePath = os.tmpdir() + "/state.json";

module.exports = {
  read,
  getFilepath
};

function read() {
  console.log(`Checking for state.json at ${stateFilePath}`);
  return fileExists(stateFilePath)
    ? JSON.parse(fs.readFileSync(stateFilePath, "utf-8"))
    : {};
}

function getFilepath() {
  return stateFilePath;
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.R_OK);
  } catch (error) {
    return false;
  }

  return true;
}
