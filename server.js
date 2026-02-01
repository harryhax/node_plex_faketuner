import "dotenv/config";
import express from "express";
import fs from "fs";
import { spawn } from "child_process";
import os from "os";

import { loadM3U } from "./m3uLoader.js";
import { getSelected, saveSelected } from "./channelStore.js";
import { startSSDP } from "./ssdp.js";

const app = express();
const PORT = 5004;

app.use(express.json());
app.use(express.static("public"));

let cachedChannels = [];
let ffmpeg = null;

function getLocalIp() {
  try {
    const nets = os.networkInterfaces();

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (err) {
    console.error("getLocalIp error:", err);
  }

  return "127.0.0.1";
}

async function refreshPlaylist() {
  try {
    if (!process.env.M3U_URL) return;

    const channels = await loadM3U(process.env.M3U_URL);
    cachedChannels = channels;
  } catch (err) {
    console.error("refreshPlaylist error:", err);
  }
}

try {
  await refreshPlaylist();
} catch (err) {
  console.error("Startup playlist load failed:", err);
}

app.get("/config", (req, res) => {
  try {
    res.json({
      m3uUrl: process.env.M3U_URL || ""
    });
  } catch (err) {
    console.error("/config GET error:", err);
    res.status(500).end();
  }
});

app.post("/config", async (req, res) => {
  try {
    const url = req.body.url || "";

    const envLines = fs.existsSync(".env")
      ? fs
          .readFileSync(".env", "utf8")
          .split("\n")
          .filter(l => !l.startsWith("M3U_URL="))
      : [];

    envLines.push(`M3U_URL=${url}`);
    fs.writeFileSync(".env", envLines.join("\n"));

    process.env.M3U_URL = url;

    await refreshPlaylist();

    res.json({ ok: true });
  } catch (err) {
    console.error("/config POST error:", err);
    res.status(500).end();
  }
});

app.post("/load", (req, res) => {
  try {
    res.json(cachedChannels);
  } catch (err) {
    console.error("/load error:", err);
    res.status(500).end();
  }
});

app.post("/save", (req, res) => {
  try {
    saveSelected(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("/save error:", err);
    res.status(500).end();
  }
});

app.get("/discover.json", (req, res) => {
  try {
    const ip = getLocalIp();

    res.json({
      FriendlyName: "node_plex_faketuner",
      Manufacturer: "HarryLabs",
      ModelNumber: "HDHR4-2US",
      FirmwareName: "hdhomerun",
      FirmwareVersion: "20240101",
      DeviceID: "A1B2C3D4",
      DeviceAuth: "faketuner",
      BaseURL: `http://${ip}:${PORT}`,
      TunerCount: 1
    });
  } catch (err) {
    console.error("/discover.json error:", err);
    res.status(500).end();
  }
});

app.get("/lineup.json", (req, res) => {
  try {
    const ip = getLocalIp();
    const channels = getSelected();

    res.json(
      channels.map((c, i) => ({
        GuideNumber: String(i + 1),
        GuideName: c.name,
        URL: `http://${ip}:${PORT}/stream/${i}`
      }))
    );
  } catch (err) {
    console.error("/lineup.json error:", err);
    res.status(500).end();
  }
});

app.get("/stream/:id", (req, res) => {
  try {
    const channels = getSelected();
    const ch = channels[Number(req.params.id)];

    if (!ch) return res.end();

    res.setHeader("Content-Type", "video/mp2t");

    ffmpeg = spawn("ffmpeg", [
      "-re",
      "-i",
      ch.url,
      "-c",
      "copy",
      "-f",
      "mpegts",
      "pipe:1"
    ]);

    ffmpeg.stdout.pipe(res);

    req.on("close", () => {
      if (ffmpeg) {
        ffmpeg.kill("SIGKILL");
        ffmpeg = null;
      }
    });
  } catch (err) {
    console.error("/stream error:", err);
    res.status(500).end();
  }
});

app.listen(PORT, () => {
  try {
    const ip = getLocalIp();
    const baseUrl = `http://${ip}:${PORT}`;

    console.log(`Fake tuner running on ${baseUrl}`);

    startSSDP(baseUrl);
  } catch (err) {
    console.error("SSDP startup error:", err);
  }
});
