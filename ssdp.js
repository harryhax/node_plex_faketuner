import dgram from "dgram";

const MULTICAST_ADDR = "239.255.255.250";
const PORT = 1900;

export function startSSDP(baseUrl) {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  socket.on("error", err => {
    console.error("SSDP socket error:", err);
  });

  socket.on("message", (msg, rinfo) => {
    const text = msg.toString();

    if (!text.startsWith("M-SEARCH")) return;

    const stLine = text
      .split("\r\n")
      .find(l => l.toUpperCase().startsWith("ST:"));

    if (!stLine) return;

    const st = stLine.split(":").slice(1).join(":").trim();

    const validST = [
      "ssdp:all",
      "upnp:rootdevice",
      "urn:schemas-upnp-org:device:Basic:1",
      "urn:schemas-upnp-org:device:MediaServer:1"
    ];

    if (!validST.includes(st)) return;

    const response =
      "HTTP/1.1 200 OK\r\n" +
      "CACHE-CONTROL: max-age=1800\r\n" +
      "EXT:\r\n" +
      "LOCATION: " + baseUrl + "/device.xml\r\n" +
      "SERVER: Linux/3.10 UPnP/1.0 HDHomeRun/1.0\r\n" +
      "ST: " + st + "\r\n" +
      "USN: uuid:HDHomeRun\r\n\r\n";

    socket.send(
      response,
      0,
      response.length,
      rinfo.port,
      rinfo.address
    );
  });

  socket.bind(PORT, () => {
    socket.addMembership(MULTICAST_ADDR);
    console.log("SSDP discovery started");
  });
}
