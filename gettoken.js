const http = require("http");

const authData = JSON.stringify({
  email: "js406@srmist.edu.in",
  name: "Jaish Siddineni",
  rollNo: "RA2311003010632",
  accessCode: "QkbpxH",
  clientID: "1365bf83-188b-4062-8f14-4f0f23dba4da",
  clientSecret: "NkZpMvSAdTxRZXpu"
});
const options = {
  hostname: "20.207.122.201",
  path: "/evaluation-service/auth",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(authData)
  }
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("AUTH RESPONSE:");
    console.log(body);
  });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(authData);
req.end();