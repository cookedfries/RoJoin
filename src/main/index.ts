import { app } from "electron";
import { App } from "./App";

let rojoinApp: App | null = null;

app.on("ready", async () => {
  rojoinApp = new App();
  await rojoinApp.init();
});

app.on("window-all-closed", () => {
  rojoinApp?.quit();
  rojoinApp = null;
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (rojoinApp === null) {
    rojoinApp = new App();
    rojoinApp.init();
  }
});
