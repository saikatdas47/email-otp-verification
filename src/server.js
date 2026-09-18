require("dotenv").config();

const { createApp } = require("./app");
const { createMailer } = require("./mailer");

const port = Number(process.env.PORT) || 3000;

try {
  const sendOtpEmail = createMailer({
    user: process.env.EMAIL_USER,
    appPassword: process.env.EMAIL_APP_PASSWORD,
    fromName: process.env.EMAIL_FROM_NAME
  });

  const app = createApp({ sendOtpEmail, otpSecret: process.env.OTP_SECRET });
  app.listen(port, () => console.log(`Email OTP app is running at http://localhost:${port}`));
} catch (error) {
  console.error(`Startup error: ${error.message}`);
  process.exit(1);
}
