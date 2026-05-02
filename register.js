const https = require("http");

// STEP 1 - REGISTER
const registerData = JSON.stringify({
  email: "js406@srmist.edu.in",
  name: "Jaish Siddineni",
  mobileNo: "9673501672",
  githubUsername: "Jaish-Siddineni",
  rollNo: "RA2311003010632",
  accessCode: "QkbpxH"
});

const options = {
  hostname: "20.207.122.201",
  path: "/evaluation-service/register",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(registerData)
  }
};

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("REGISTRATION RESPONSE:");
    console.log(body);
    console.log("\n⚠️  SAVE YOUR clientID and clientSecret - you cannot retrieve them again!");
  });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(registerData);
req.end();