const path = require("path");
const { app } = require("electron");

const appPath = app.getAppPath();
const asarPath =
  appPath.indexOf("app.asar") > -1
    ? appPath.substring(0, appPath.indexOf("app.asar"))
    : appPath;

module.exports = {
  APP_CONFIG_TOOL_PATH: path.join(asarPath, "./public/tool.exe"),
  APP_CONFIG_ICO: path.join(asarPath, "./public/icon/icon.ico"),
};
