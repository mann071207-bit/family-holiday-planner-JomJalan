const { contextBridge } = require("electron");
const fs = require("fs");
const path = require("path");

contextBridge.exposeInMainWorld("appData", {
  getPackages: () =>
    JSON.parse(fs.readFileSync(path.join(__dirname, "data", "packages.json"), "utf8"))
});