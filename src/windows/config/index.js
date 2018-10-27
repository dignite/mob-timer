const ipc = require("electron").ipcRenderer;
const { dialog } = require("electron").remote;
const fetch = require("node-fetch");

const mobbersEl = document.getElementById("mobbers");
const minutesEl = document.getElementById("minutes");
const addEl = document.getElementById("add");
const githubAccessTokenElement = document.getElementById(
  "githubAccessTokenElement"
);
const addMobberForm = document.getElementById("addMobberForm");
const loadMobbersFromGithubForm = document.getElementById(
  "loadMobbersFromGithubForm"
);
const fullscreenSecondsEl = document.getElementById("fullscreen-seconds");
const alertAudioCheckbox = document.getElementById("alertAudio");
const replayAudioContainer = document.getElementById("replayAudioContainer");
const replayAlertAudioCheckbox = document.getElementById("replayAlertAudio");
const replayAudioAfterSeconds = document.getElementById(
  "replayAudioAfterSeconds"
);
const useCustomSoundCheckbox = document.getElementById("useCustomSound");
const customSoundEl = document.getElementById("customSound");
const timerAlwaysOnTopCheckbox = document.getElementById("timerAlwaysOnTop");
const organizationsList = document.getElementById("organizationsList");
const addCoAuthorGitHook = document.getElementById("addCoAuthorGitHook");

function createMobberEl(mobber) {
  const el = document.createElement("div");
  el.classList.add("mobber");
  if (mobber.disabled) {
    el.classList.add("disabled");
  }

  const imgEl = document.createElement("img");
  imgEl.src = mobber.image || "../img/sad-cyclops.png";
  imgEl.classList.add("image");
  el.appendChild(imgEl);

  const nameEl = document.createElement("div");
  nameEl.innerHTML = mobber.name;
  nameEl.classList.add("name");
  el.appendChild(nameEl);

  const disableBtn = document.createElement("button");
  disableBtn.classList.add("btn");
  disableBtn.innerHTML = mobber.disabled ? "Enable" : "Disable";
  el.appendChild(disableBtn);

  const rmBtn = document.createElement("button");
  rmBtn.classList.add("btn");
  rmBtn.innerHTML = "Remove";
  el.appendChild(rmBtn);

  imgEl.addEventListener("click", _ => selectImage(mobber));
  disableBtn.addEventListener("click", _ => toggleMobberDisabled(mobber));
  rmBtn.addEventListener("click", _ => ipc.send("removeMobber", mobber));

  return el;
}

function selectImage(mobber) {
  var image = dialog.showOpenDialog({
    title: "Select image",
    filters: [{ name: "Images", extensions: ["jpg", "png", "gif"] }],
    properties: ["openFile"]
  });

  if (image) {
    mobber.image = image[0];
    ipc.send("updateMobber", mobber);
  }
}

function toggleMobberDisabled(mobber) {
  mobber.disabled = !mobber.disabled;
  ipc.send("updateMobber", mobber);
}

ipc.on("configUpdated", (event, data) => {
  minutesEl.value = Math.ceil(data.secondsPerTurn / 60);
  mobbersEl.innerHTML = "";
  const frag = document.createDocumentFragment();
  data.mobbers.map(mobber => {
    frag.appendChild(createMobberEl(mobber));
  });
  mobbersEl.appendChild(frag);
  fullscreenSecondsEl.value = data.secondsUntilFullscreen;

  alertAudioCheckbox.checked = data.alertSoundTimes.length > 0;
  replayAlertAudioCheckbox.checked = data.alertSoundTimes.length > 1;
  replayAudioAfterSeconds.value =
    data.alertSoundTimes.length > 1 ? data.alertSoundTimes[1] : 30;
  updateAlertControls();

  useCustomSoundCheckbox.checked = !!data.alertSound;
  customSoundEl.value = data.alertSound;

  timerAlwaysOnTopCheckbox.checked = data.timerAlwaysOnTop;
});

minutesEl.addEventListener("change", _ => {
  ipc.send("setSecondsPerTurn", minutesEl.value * 60);
});

addMobberForm.addEventListener("submit", event => {
  event.preventDefault();
  let value = addEl.value.trim();
  if (!value) {
    return;
  }
  ipc.send("addMobber", { name: value });
  addEl.value = "";
});

loadMobbersFromGithubForm.addEventListener("submit", async event => {
  event.preventDefault();
  let token = githubAccessTokenElement.value.trim();
  if (!token) {
    return;
  }
  organizationsList.innerHTML = "";

  const orgsResponse = await fetch(
    `https://api.github.com/user/orgs?access_token=${token}`
  );
  const orgsJson = await orgsResponse.json();
  const organizationsListItems = orgsJson.map(organization => {
    const button = document.createElement("button");
    button.textContent = `Add mobbers from ${organization.login}`;
    button.className = "btn";

    button.addEventListener("click", async () => {
      const membersUrl =
        organization.members_url.replace("{/member}", "") +
        `?access_token=${token}`;
      const membersResponse = await fetch(membersUrl);
      const membersJson = await membersResponse.json();
      const membersInfoJson = await Promise.all(
        membersJson.map(async member => {
          const response = await fetch(member.url + `?access_token=${token}`);
          const json = await response.json();
          return json;
        })
      );
      const mobbers = membersInfoJson.map(teamMember => {
        const email =
          teamMember.email || `${teamMember.login}@users.noreply.github.com`;
        return {
          image: teamMember.avatar_url,
          name: teamMember.name || teamMember.login,
          disabled: true,
          githubAuthor: `${teamMember.name} <${email}>`
        };
      });
      mobbers.forEach(mobber => ipc.send("addMobber", mobber));
    });

    const li = document.createElement("li");
    li.appendChild(button);
    return li;
  });

  organizationsList.innerHTML = "";
  organizationsListItems.forEach(listItem =>
    organizationsList.appendChild(listItem)
  );
});

fullscreenSecondsEl.addEventListener("change", _ => {
  ipc.send("setSecondsUntilFullscreen", fullscreenSecondsEl.value * 1);
});

addCoAuthorGitHook.addEventListener("click", () =>
  ipc.send("addCoAuthorGitHook")
);

ipc.send("configWindowReady");

alertAudioCheckbox.addEventListener("change", _ => updateAlertTimes());
replayAlertAudioCheckbox.addEventListener("change", _ => updateAlertTimes());
replayAudioAfterSeconds.addEventListener("change", _ => updateAlertTimes());

function updateAlertTimes() {
  updateAlertControls();

  let alertSeconds = [];
  if (alertAudioCheckbox.checked) {
    alertSeconds.push(0);
    if (replayAlertAudioCheckbox.checked) {
      alertSeconds.push(replayAudioAfterSeconds.value * 1);
    }
  }

  ipc.send("setAlertSoundTimes", alertSeconds);
}

function updateAlertControls() {
  let replayDisabled = !alertAudioCheckbox.checked;
  replayAlertAudioCheckbox.disabled = replayDisabled;

  if (replayDisabled) {
    replayAlertAudioCheckbox.checked = false;
    replayAudioContainer.classList.add("disabled");
  } else {
    replayAudioContainer.classList.remove("disabled");
  }

  let secondsDisabled = !replayAlertAudioCheckbox.checked;
  replayAudioAfterSeconds.disabled = secondsDisabled;
}

useCustomSoundCheckbox.addEventListener("change", _ => {
  let mp3 = null;

  if (useCustomSoundCheckbox.checked) {
    selectedMp3 = dialog.showOpenDialog({
      title: "Select alert sound",
      filters: [{ name: "MP3", extensions: ["mp3"] }],
      properties: ["openFile"]
    });

    if (selectedMp3) {
      mp3 = selectedMp3[0];
    } else {
      useCustomSoundCheckbox.checked = false;
    }
  }

  ipc.send("setAlertSound", mp3);
});

timerAlwaysOnTopCheckbox.addEventListener("change", _ => {
  ipc.send("setTimerAlwaysOnTop", timerAlwaysOnTopCheckbox.checked);
});
