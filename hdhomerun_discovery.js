// hdhomerun_discovery.js
import dgram from "dgram";

const PORT = 65001;

export function startHDHomeRunDiscovery({ deviceId, ip, tunerCount }) {
  const socket = dgram.createSocket("udp4");

  socket.on("message", (msg, rinfo) => {
    // HDHomeRun discovery request is binary.
    // Any packet received → respond with discovery reply.

    const response = Buffer.alloc(32);

    // HDHomeRun discovery response format
    // https://github.com/Silicondust/libhdhomerun (reverse engineered)

    // Magic
    response.writeUInt32BE(0x44485344, 0); // "DHSD"

    // Device ID
    response.writeUInt32BE(parseInt(deviceId, 16), 4);

    // IP
    ip.split(".").forEach((n, i) =>
      response.writeUInt8(parseInt(n), 8 + i)
    );

    // Tuner count
    response.writeUInt8(tunerCount, 12);

    socket.send(response, 0, response.length, rinfo.port, rinfo.address);
  });

  socket.bind(PORT, () => {
    socket.setBroadcast(true);
    console.log("HDHomeRun discovery listening on UDP 65001");
  });
}
