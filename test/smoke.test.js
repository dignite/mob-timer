var Application = require("spectron").Application;
const electronPath = require("electron");
const path = require("path");

var app = new Application({
  path: electronPath,
  env: { RUNNING_IN_SPECTRON: "1" },
  args: [path.join(__dirname, "..")]
});

describe("Smoke tests", () => {
  it("should simply start", () => {
    return app
      .start()
      .then(() => app.browserWindow.isVisible())
      .then(isVisible => expect(isVisible).toEqual(true))
      .then(() => app.client.getTitle())
      .then(title => expect(title).toEqual("Mob Timer"))
      .finally(() => app.stop());
  });
});
