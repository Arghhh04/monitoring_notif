const https = require("https");
const path = require("path");

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const serviceAccount = require(
  process.env.RENDER
    ? "/etc/secrets/serviceAccountKey.json"
    : path.join(__dirname, "serviceAccountKey.json")
);

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://monitoring-kualitas-air-6cc88-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = getDatabase();

// ===== GANTI DENGAN TOPIC NTFY-MU =====
const TOPIC = "monitoring-akuarium-arga";

let lastStatus = "";

// ===== Fungsi kirim ke ntfy =====
function kirimNotif(data) {

  const pesan =
    `Status : ${data.status}

Suhu : ${Number(data.suhu).toFixed(1)} °C
pH : ${Number(data.ph).toFixed(1)}
TDS : ${Number(data.tds).toFixed(0)} ppm`;

  const options = {
    hostname: "ntfy.sh",
    path: "/" + TOPIC,
    method: "POST",
    headers: {
      "Title": "Smart Aquarium",
      "Priority": data.status === "BAHAYA" ? "max" : "high",
      "Tag": "smart-aquarium",
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(pesan)
    }
  };

  const req = https.request(options, (res) => {
    console.log("Notif terkirim. Status:", res.statusCode);
  });

  req.on("error", (err) => {
    console.error(err);
  });

  req.write(pesan);
  req.end();
}

console.log("Monitoring Firebase berjalan...");

// ===== Listener Firebase =====
db.ref("monitoring").on("value", (snapshot) => {

  const data = snapshot.val();

  if (!data) return;

  if (data.status !== "AMAN" &&
    data.status !== lastStatus) {

    kirimNotif(data);

    lastStatus = data.status;
  }

  if (data.status === "AMAN") {

    lastStatus = "";

  }

});