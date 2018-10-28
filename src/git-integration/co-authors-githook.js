const fs = require("fs");
const path = require("path");
const initSimpleGit = require("simple-git");
const simpleGit = initSimpleGit();

module.exports = {
  addAsGlobalHook
};

async function addAsGlobalHook(stateFilePath) {
  if (!fileExists(stateFilePath)) {
    throw new Error(`Config file not found at ${stateFilePath}`);
  }

  try {
    const hooksLocation = await getGlobalHooksLocation();
    if (!hooksLocation.isConfigured) {
      throw new Error("Global git hooks path not configured!");
    }

    console.log(
      `Git hook checking ${stateFilePath} will be added to ${
        hooksLocation.path
      }`
    );

    await fs.writeFileSync(
      path.join(hooksLocation.path, "prepare-commit-msg"),
      getPrepareCommitMessage(stateFilePath),
      { flag: "w" }
    );
  } catch (error) {
    throw new Error(`Unable to determine global git hooks path!, ${error}`);
  }
}

function fileExists(filePath) {
  console.log(`Checking for state.json at ${filePath}`);
  try {
    fs.accessSync(filePath, fs.R_OK);
  } catch (error) {
    console.error(error);
    return false;
  }

  return true;
}

function getGlobalHooksLocation() {
  return new Promise((resolve, reject) => {
    simpleGit.raw(["config", "--global", "core.hooksPath"], (err, result) => {
      if (err !== null) {
        reject(err);
      } else {
        const isConfigured = result !== null;
        resolve({
          path: isConfigured ? result.trim() : null,
          isConfigured: result !== null
        });
      }
    });
  });
}

function getPrepareCommitMessage(stateFilePath) {
  return `#!/usr/bin/env node

const log = (msg) => console.log("\\t" + msg);
const newLine = () => console.log("");

newLine();
log("Co-author prepare-commit-msg hook initiated!");
log("This plugin will add active mobbers in mob timer as Co-authors recognized by github.");
log("To opt out, have no active mobbers or add '[solo]' to the commit msg.");
newLine();


const fs = require("fs");

const message = fs.readFileSync(process.argv[2], "utf8").trim();

if(message.indexOf("Co-authored-by") !== -1) {
    log("Already has co-authors, to adjust, redo the commit");
    process.exit(0);
}


if(message.indexOf("[solo]") !== -1) {
  log("Tag [solo] found, not adding co-authors!");
  const messageWithoutSoloTag = message.replace("[solo]", "").trim();
  fs.writeFileSync(process.argv[2], messageWithoutSoloTag);
  process.exit(0);
}

const mobtimerState = JSON.parse(
    fs.readFileSync(
    "${path.normalize(stateFilePath).replace(/\\/g, "\\\\")}",
    "utf-8"
    )
);

const coAuthorTail = mobtimerState.mobbers
    .filter(mobber => !mobber.disabled)
    .map(mobber => \`Co-authored-by: \${mobber.githubAuthor || mobber.name}\`);

if (!coAuthorTail.length) {
    log("No mobbers active are active!");
    process.exit(0);
}

const newCommitMessage = \`\${message}\\n\\n\\n\${coAuthorTail.join("\\n")}\`;


coAuthorTail.forEach(coAuthor => log(coAuthor));
newLine();

fs.writeFileSync(process.argv[2], newCommitMessage);

process.exit(0);`;
}
