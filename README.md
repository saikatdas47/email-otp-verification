# Email OTP Verification

A small Node.js + Express project that sends a six-digit, single-use email OTP through Gmail SMTP.

## Setup

1. Use Node.js 18 or newer.
2. Copy `.env.example` to `.env`.
3. In `.env`, set `EMAIL_USER` to your Gmail address.
4. Turn on 2-Step Verification in your Google Account, create an App Password, and set it as `EMAIL_APP_PASSWORD`. Do not use your normal Gmail password.
5. Replace `OTP_SECRET` with a long random value.
6. Run `npm install`, then `npm start`.
7. Open <http://localhost:3000>.

The OTP expires after five minutes, can be used only once, and is never returned by the API. This demo stores pending OTPs in memory, so restarting the server clears them. For production, use a shared store such as Redis and add stronger rate limiting.
