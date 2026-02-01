import "dotenv/config";
import express from "express";
import fs from "fs";
import { spawn } from "child_process";
import { loadM3U } from "./m3uLoader.js";
import { getSelected, saveSelected } from "./channelStore.js";
import os from "os";
import { startSSDP } from "./ssdp.js";

const app = express();
const PORT = 5004;

app.use(express.json());
app.use(express.static("public"));

let cachedChannels = [];
let ffmpeg = null;

function getLocalIp() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return "127.0.0.1";
}

async function refreshPlaylist() {
  if (!process.env.M3U_URL) return;

  const channels = await loadM3U(process.env.M3U_URL);
  cachedChannels = channels;
}

await refreshPlaylist();

app.get("/config", (req, res) => {
  res.json({
    m3uUrl: process.env.M3U_URL || ""
  });
});

app.post("/config", async (req, res) => {
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
});

app.post("/load", (req, res) => {
  res.json(cachedChannels);
});

app.post("/save", (req, res) => {
  saveSelected(req.body);
  res.json({ ok: true });
});

app.get("/discover.json", (req, res) => {
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
});

app.get("/lineup.json", (req, res) => {
  const ip = getLocalIp();
  const channels = getSelected();

  res.json(
    channels.map((c, i) => ({
      GuideNumber: String(i + 1),
      GuideName: c.name,
      URL: `http://${ip}:${PORT}/stream/${i}`
    }))
  );
});

app.get("/stream/:id", (req, res) => {
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
});

app.listen(PORT, () => {
  const ip = getLocalIp();
  const baseUrl = `http://${ip}:${PORT}`;

  console.log(`Fake tuner running on ${baseUrl}`);

  startSSDP(baseUrl);
});
