"use strict";
/**
 * login.js
 * - Client-side validation with clear inline errors
 * - Show/hide password toggle
 * - "Remember me" stores username in localStorage
 * - jQuery animations (fade, shake on error)
 * - Graceful, accessible messaging
 */

$(function () {
  // Cache nodes with querySelector and wrap with $ when animating
  const form = document.querySelector("#login-form");
  const usernameInput = document.querySelector("#username");
  const passwordInput = document.querySelector("#password");
  const usernameError = document.querySelector("#username-error");
  const passwordError = document.querySelector("#password-error");
  const msg = document.querySelector("#login-msg");
  const rememberMe = document.querySelector("#remember-me");
  const toggleBtn = document.querySelector("#toggle-password");

  // Prefill username if remembered
  try {
    const remembered = localStorage.getItem("sb_username") || "";
    if (remembered) {
      usernameInput.value = remembered;
      rememberMe.checked = true;
    }
  } catch {}

  // Show/hide password
  toggleBtn?.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleBtn.textContent = isHidden ? "Hide" : "Show";
    passwordInput.focus();
  });

  // Little helper to show an error next to an input
  const showError = (el, errorEl, text) => {
    errorEl.textContent = text || "";
    if (text) {
      // subtle jQuery "shake" on error
      const $field = $(el);
      $field
        .stop(true, true)
        .animate({ marginLeft: "-6px" }, 80)
        .animate({ marginLeft: "6px" }, 80)
        .animate({ marginLeft: "0px" }, 80);
    }
  };

  // Simple sanity check for fields
  const validate = () => {
    let ok = true;
    showError(usernameInput, usernameError, "");
    showError(passwordInput, passwordError, "");
    msg.textContent = "";
    msg.className = "";

    if (!usernameInput.value.trim()) {
      showError(usernameInput, usernameError, "Username is required.");
      ok = false;
    }
    if (!passwordInput.value.trim()) {
      showError(passwordInput, passwordError, "Password is required.");
      ok = false;
    }
    return ok;
  };

  // Handle submit
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validate()) return;

    // Demo credentials
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Remember me persistence
    try {
      if (rememberMe.checked) {
        localStorage.setItem("sb_username", username);
      } else {
        localStorage.removeItem("sb_username");
      }
    } catch {}

    // Fake auth (Will learn and implement real auth later in next semester)
    const ok = username === "Gaurav" && password === "1234";

    if (ok) {
      msg.textContent = "Login successful! Redirecting…";
      msg.className = "success";

      // Small success fade
      $(msg).hide().fadeIn(200);

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);
    } else {
      msg.textContent =
        "Invalid credentials. Username 'Gaurav' / password '1234'";
      msg.className = "error";

      // Shake the form slightly on failure
      const $form = $(form);
      $form
        .stop(true, true)
        .animate({ marginLeft: "-8px" }, 80)
        .animate({ marginLeft: "8px" }, 80)
        .animate({ marginLeft: "0px" }, 80);

      // Reset password for safety
      passwordInput.value = "";
      passwordInput.focus();
    }
  });

  // Animate the login card in (coexists with your global data-animate)
  const $container = $(".login-container");
  $container
    .css({ opacity: 0, transform: "translateY(10px)" })
    .animate({ opacity: 1 }, 550)
    .css({ transform: "translateY(0)" });
});
