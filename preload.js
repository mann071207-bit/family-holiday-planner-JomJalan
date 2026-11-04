const { contextBridge } = require("electron");
const fs = require("fs");
const path = require("path");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "data", file), "utf8"));
}

contextBridge.exposeInMainWorld("appData", {
  getPackages: () => readJson("packages.json"),
  getDestinations: () => readJson("destinations.json")
});