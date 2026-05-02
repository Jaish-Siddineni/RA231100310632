const http = require("http");

// Replace with your details before running
const registerData = JSON.stringify({
  email: "YOUR_COLLEGE_EMAIL",
  name: "YOUR_FULL_NAME",
  mobileNo: "YOUR_MOBILE_NUMBER",
  githubUsername: "YOUR_GITHUB_USERNAME",
  rollNo: "YOUR_ROLL_NUMBER",
  accessCode: "YOUR_ACCESS_CODE"
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

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("REGISTRATION RESPONSE:");
    console.log(body);
    console.log("\n⚠️  SAVE YOUR clientID and clientSecret!");
  });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(registerData);
req.end();