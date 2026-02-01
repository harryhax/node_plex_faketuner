import fetch from "node-fetch";

export async function loadM3U(url) {
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.split("\n").map(l => l.trim());

  const channels = [];

  let name = null;

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      const parts = line.split(",");
      name = parts.slice(1).join(",").trim();
      continue;
    }

    if (!line || line.startsWith("#")) continue;

    channels.push({
      name: name || "Unnamed Channel",
      url: line
    });

    name = null;
  }

  return channels;
}
