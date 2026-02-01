import dgram from "dgram";

export function startSSDP(baseUrl) {
  const socket = dgram.createSocket("udp4");

  socket.on("error", err => {
    console.error("SSDP socket error:", err);
  });

  socket.on("message", (msg, rinfo) => {
    const text = msg.toString();

    if (!text.includes("M-SEARCH")) return;
    if (!text.includes("ssdp:discover")) return;

    const response =
      "HTTP/1.1 200 OK\r\n" +
      "CACHE-CONTROL: max-age=1800\r\n" +
      "EXT:\r\n" +
      "LOCATION: " + baseUrl + "/discover.json\r\n" +
      "SERVER: node_plex_faketuner/0.0.1\r\n" +
      "ST: urn:schemas-upnp-org:device:MediaServer:1\r\n" +
      "USN: uuid:node-plex-faketuner\r\n\r\n";

    socket.send(
      response,
      0,
      response.length,
      rinfo.port,
      rinfo.address
    );
  });

  socket.bind(1900, () => {
    try {
      socket.addMembership("239.255.255.250");
      console.log("SSDP discovery started");
    } catch (err) {
      console.error("SSDP multicast join failed:", err);
    }
  });
}
