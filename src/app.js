const crypto = require("crypto");
const express = require("express");
const path = require("path");

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const isValidOtp = (otp) => /^\d{6}$/.test(String(otp || ""));

function hashOtp(email, otp, secret) {
  return crypto.createHmac("sha256", secret).update(`${email}:${otp}`).digest("hex");
}

function safeEqualHex(left, right) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createApp({ sendOtpEmail, otpSecret, now = () => Date.now(), randomInt = crypto.randomInt }) {
  if (typeof sendOtpEmail !== "function") throw new Error("sendOtpEmail is required");
  if (!otpSecret || otpSecret.length < 16) throw new Error("OTP_SECRET must be at least 16 characters");

  const app = express();
  const pendingOtps = new Map();

  app.use(express.json({ limit: "10kb" }));
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/api/health", (_req, res) => res.json({ success: true, message: "Server is running" }));

  app.post("/api/otp/send", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    const existing = pendingOtps.get(email);
    if (existing && now() - existing.sentAt < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "Please wait one minute before requesting another code." });
    }

    const otp = String(randomInt(100000, 1000000));
    const record = {
      hash: hashOtp(email, otp, otpSecret),
      expiresAt: now() + OTP_TTL_MS,
      sentAt: now(),
      attempts: 0
    };

    try {
      await sendOtpEmail({ email, otp });
      pendingOtps.set(email, record);
      return res.json({ success: true, message: "A verification code was sent to your email." });
    } catch (error) {
      console.error("Email delivery failed:", error.message);
      return res.status(502).json({ success: false, message: "Could not send the email. Check the server email configuration and try again." });
    }
  });

  app.post("/api/otp/verify", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!isValidEmail(email) || !isValidOtp(otp)) {
      return res.status(400).json({ success: false, message: "Enter a valid email and six-digit code." });
    }

    const record = pendingOtps.get(email);
    if (!record) {
      return res.status(400).json({ success: false, message: "No active code was found. Request a new one." });
    }

    if (now() > record.expiresAt) {
      pendingOtps.delete(email);
      return res.status(400).json({ success: false, message: "The code has expired. Request a new one." });
    }

    record.attempts += 1;
    const matches = safeEqualHex(record.hash, hashOtp(email, otp, otpSecret));
    if (!matches) {
      if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        pendingOtps.delete(email);
        return res.status(429).json({ success: false, message: "Too many incorrect attempts. Request a new code." });
      }
      return res.status(400).json({ success: false, message: "The verification code is incorrect." });
    }

    pendingOtps.delete(email);
    return res.json({ success: true, verified: true, message: "Email authenticated and verified successfully!" });
  });

  return app;
}

module.exports = { createApp };
