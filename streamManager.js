import fs from "fs";

export function loadStreams() {
  const raw = fs.readFileSync("./streams.json", "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.streams) || data.streams.length === 0) {
    throw new Error("streams.json must contain a non-empty streams array");
  }

  return data.streams;
}
