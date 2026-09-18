const nodemailer = require("nodemailer");

function createMailer({ user, appPassword, fromName = "Email OTP Demo" }) {
  if (!user || !appPassword) {
    throw new Error("EMAIL_USER and EMAIL_APP_PASSWORD must be set in .env");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword }
  });

  return async function sendOtpEmail({ email, otp }) {
    await transporter.sendMail({
      from: `"${fromName.replace(/[\r\n"]/g, "")}" <${user}>`,
      to: email,
      subject: "Your email verification code",
      text: `Your verification code is ${otp}. It expires in 5 minutes. If you did not request it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Email verification</h2><p>Use this code to verify your email:</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires in 5 minutes and can be used only once.</p><p>If you did not request it, you can ignore this email.</p></div>`
    });
  };
}

module.exports = { createMailer };
