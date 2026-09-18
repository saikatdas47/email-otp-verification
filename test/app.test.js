const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");

async function startTestApp(options = {}) {
  let sent;
  const app = createApp({
    otpSecret: "test-secret-at-least-16-characters",
    randomInt: () => 123456,
    sendOtpEmail: async (payload) => { sent = payload; },
    ...options
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { baseUrl, getSent: () => sent, close: () => new Promise((resolve) => server.close(resolve)) };
}

test("sends and verifies a single-use OTP without returning it", async () => {
  const api = await startTestApp();
  try {
    const sendResponse = await fetch(`${api.baseUrl}/api/otp/send`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "Test@Example.com" })
    });
    const sendBody = await sendResponse.json();
    assert.equal(sendResponse.status, 200);
    assert.equal(JSON.stringify(sendBody).includes("123456"), false);
    assert.deepEqual(api.getSent(), { email: "test@example.com", otp: "123456" });

    const verify = () => fetch(`${api.baseUrl}/api/otp/verify`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "test@example.com", otp: "123456" })
    });
    assert.equal((await verify()).status, 200);
    assert.equal((await verify()).status, 400);
  } finally { await api.close(); }
});

test("rejects an expired OTP", async () => {
  let currentTime = 1000;
  const api = await startTestApp({ now: () => currentTime });
  try {
    await fetch(`${api.baseUrl}/api/otp/send`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "test@example.com" })
    });
    currentTime += 5 * 60 * 1000 + 1;
    const response = await fetch(`${api.baseUrl}/api/otp/verify`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "test@example.com", otp: "123456" })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /expired/i);
  } finally { await api.close(); }
});
