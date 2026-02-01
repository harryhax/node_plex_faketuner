import fs from "fs";

const FILE = "./selected.json";

export function getSelected() {
  if (!fs.existsSync(FILE)) return [];
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

export function saveSelected(channels) {
  fs.writeFileSync(FILE, JSON.stringify(channels, null, 2));
}
