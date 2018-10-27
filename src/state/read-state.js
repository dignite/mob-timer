let fs = require("fs");
let os = require("os");

let stateFilePath = os.tmpdir() + "/state.json";

module.exports = {
  read
};

function read() {
  console.log(`Checking for state.json at ${stateFilePath}`);
  return fileExists(stateFilePath)
    ? JSON.parse(fs.readFileSync(stateFilePath, "utf-8"))
    : {};
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.R_OK);
  } catch (error) {
    return false;
  }

  return true;
}
