import dgram from "dgram";

export function startSSDP(baseUrl) {
  const socket = dgram.createSocket("udp4");

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

    socket.send(response, rinfo.port, rinfo.address);
  });

  socket.bind(1900, () => {
    socket.addMembership("239.255.255.250");
  });
}
