const emailForm = document.querySelector("#email-form");
const otpForm = document.querySelector("#otp-form");
const emailInput = document.querySelector("#email");
const otpInput = document.querySelector("#otp");
const message = document.querySelector("#message");

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = type;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = emailForm.querySelector("button");
  button.disabled = true;
  showMessage("Sending code…");
  try {
    const data = await postJson("/api/otp/send", { email: emailInput.value });
    showMessage(data.message, "success");
    otpForm.classList.remove("hidden");
    otpInput.focus();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

otpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = otpForm.querySelector("button");
  button.disabled = true;
  showMessage("Verifying…");
  try {
    const data = await postJson("/api/otp/verify", { email: emailInput.value, otp: otpInput.value });
    showMessage(data.message, "success");
    otpForm.reset();
    otpForm.classList.add("hidden");
    emailInput.disabled = true;
    emailForm.querySelector("button").disabled = true;
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    if (!emailInput.disabled) button.disabled = false;
  }
});
