const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "RK PayTrack",
    backgroundColor: "#f4f6f8",
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");

    console.log("Loading production index:", indexPath);

    if (!fs.existsSync(indexPath)) {
      mainWindow.loadURL(
        "data:text/html;charset=utf-8," +
          encodeURIComponent(`
            <h1>RK PayTrack Error</h1>
            <p>dist/index.html was not found.</p>
            <p>${indexPath}</p>
          `)
      );
      return;
    }

    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.setTitle("RK PayTrack");
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.setName("RK PayTrack");

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});