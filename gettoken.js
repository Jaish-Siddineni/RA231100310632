const http = require("http");

// Replace with your details before running
const authData = JSON.stringify({
  email: "YOUR_COLLEGE_EMAIL",
  name: "YOUR_FULL_NAME",
  rollNo: "YOUR_ROLL_NUMBER",
  accessCode: "YOUR_ACCESS_CODE",
  clientID: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET"
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