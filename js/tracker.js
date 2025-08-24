"use strict";

/**
 * tracker.js — Add/Update entry with smooth UI
 * - Instant reveal of [data-animate]
 * - Sliding pill segmented control
 * - jQuery slide for category wrappers (tuned)
 * - Live summary chip (type • amount • category • date)
 * - Confetti burst on success
 * - Default date = today
 * - Edit mode via localStorage keys: editType, editIndex
 */

$(function () {
  /* ---------------------------
     0) Reveal sections on load
     --------------------------- */
  function revealOnView() {
    $("[data-animate]").each(function () {
      const $el = $(this);
      const threshold = $(window).scrollTop() + $(window).height() - 60;
      if ($el.offset().top < threshold) $el.addClass("show");
    });
  }
  revealOnView();
  $(window).on("load scroll", revealOnView);

  /* ---------------------------
     1) Cache DOM
     --------------------------- */
  const typeHidden = document.querySelector("#type");
  const seg = document.querySelector("#type-segmented");
  const segBtns = seg ? Array.from(seg.querySelectorAll(".seg-btn")) : [];
  const segPill = seg ? seg.querySelector(".seg-pill") : null;

  const amountField = document.querySelector("#amount");
  const noteField = document.querySelector("#note");
  const dateField = document.querySelector("#date");
  const msg = document.querySelector("#msg");
  const saveBtn = document.querySelector("#save-btn");
  const chip = document.querySelector("#live-chip");

  const expenseWrap = document.querySelector("#expense-category-wrapper");
  const incomeWrap = document.querySelector("#income-category-wrapper");
  const expenseCategory = document.querySelector("#expense-category");
  const incomeCategory = document.querySelector("#income-category");

  const typeError = document.querySelector("#error-type");
  const amountError = document.querySelector("#error-amount");
  const dateError = document.querySelector("#error-date");
  const categoryError = document.querySelector("#error-category");
  const toast = $("#toast");

  /* ---------------------------
     2) Utilities
     --------------------------- */
  const pad = (n) => String(n).padStart(2, "0");
  const today = new Date();
  const ISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate()
  )}`;
  if (!dateField.value) dateField.value = ISO;

  const speed = 260; // smooth

  // Currency prettifier
  const fmtMoney = (val) => {
    const num = Number(val || 0);
    if (!isFinite(num)) return "$0.00";
    return num.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  // Human date
  const fmtDate = (yyyy_mm_dd) => {
    if (!yyyy_mm_dd) return "";
    const [y, m, d] = yyyy_mm_dd.split("-").map((v) => +v);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Button ripple effect (micro-interaction)
  $(".btn-primary").on("click", function (e) {
    const $btn = $(this);
    const offset = $btn.offset();
    const x = e.pageX - offset.left;
    const y = e.pageY - offset.top;
    const $rip = $('<span class="ripple"/>').css({
      left: x,
      top: y,
      width: 22,
      height: 22,
    });
    $btn.append($rip);
    setTimeout(() => $rip.remove(), 650);
  });

  /* ---------------------------
     3) Segmented sliding pill
     --------------------------- */
  function movePillToActive() {
    if (!seg || !segPill) return;
    const active = seg.querySelector(".seg-btn.active") || segBtns[0];
    if (!active) return;
    const sRect = seg.getBoundingClientRect();
    const bRect = active.getBoundingClientRect();
    const left = bRect.left - sRect.left + 6; // segmented padding
    const width = bRect.width;
    seg.classList.add("ready");
    $(segPill)
      .stop(true, true)
      .animate({ left, width }, { duration: speed, easing: "swing" });
  }

  setTimeout(movePillToActive, 0);
  $(window).on("resize", movePillToActive);

  seg?.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;

    segBtns.forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    });

    typeHidden.value = btn.getAttribute("data-type"); // 'expense' | 'income'
    movePillToActive();

    if (typeHidden.value === "expense") {
      $(incomeWrap)
        .stop(true, true)
        .slideUp(speed, () => incomeWrap.classList.add("hidden"));
      expenseWrap.classList.remove("hidden");
      $(expenseWrap).hide().slideDown(speed);
    } else {
      $(expenseWrap)
        .stop(true, true)
        .slideUp(speed, () => expenseWrap.classList.add("hidden"));
      incomeWrap.classList.remove("hidden");
      $(incomeWrap).hide().slideDown(speed);
    }

    updateChip(); // reflect change immediately
  });

  /* ---------------------------
     4) Live summary chip
     --------------------------- */
  function currentCategory() {
    return typeHidden.value === "income"
      ? incomeCategory.value
      : expenseCategory.value;
  }

  function updateChip() {
    if (!chip) return;
    const type = typeHidden.value || "expense";
    const amount = amountField.value;
    const cat = currentCategory();
    const date = dateField.value;

    const parts = [];
    parts.push(`<span class="dot ${type}"></span>`);
    parts.push(type.charAt(0).toUpperCase() + type.slice(1));
    if (amount) parts.push(`<span class="sep">•</span> ${fmtMoney(amount)}`);
    if (cat) parts.push(`<span class="sep">•</span> ${cat}`);
    if (date) parts.push(`<span class="sep">•</span> ${fmtDate(date)}`);

    chip.innerHTML = parts.join(" ");
    chip.classList.remove("animate");
    // reflow to restart animation
    void chip.offsetWidth;
    chip.classList.add("animate");
  }

  // Update on all relevant inputs
  ["input", "change", "keyup"].forEach((evt) => {
    amountField?.addEventListener(evt, updateChip);
    expenseCategory?.addEventListener(evt, updateChip);
    incomeCategory?.addEventListener(evt, updateChip);
    dateField?.addEventListener(evt, updateChip);
  });
  updateChip(); // initial

  /* ---------------------------
     5) Edit mode (pre-fill)
     --------------------------- */
  const editType = localStorage.getItem("editType");
  const editIndex = localStorage.getItem("editIndex");
  if (editType && editIndex !== null) {
    const data = JSON.parse(localStorage.getItem(editType + "s")) || [];
    const entry = data[editIndex];
    if (entry) {
      seg.querySelector(`[data-type="${editType}"]`)?.click();
      amountField.value = entry.amount;
      noteField.value = entry.note || "";
      dateField.value = entry.date || ISO;
      if (editType === "expense") expenseCategory.value = entry.category || "";
      else incomeCategory.value = entry.category || "";
      saveBtn.textContent = "Update Entry";
      setTimeout(() => {
        movePillToActive();
        updateChip();
      }, 0);
    }
  }

  /* ---------------------------
     6) Validation helpers
     --------------------------- */
  const shake = ($el) =>
    $el
      .stop(true, true)
      .animate({ marginLeft: "-6px" }, 70)
      .animate({ marginLeft: "6px" }, 70)
      .animate({ marginLeft: "0px" }, 70);

  const clearErrors = () => {
    typeError.textContent = "";
    amountError.textContent = "";
    dateError.textContent = "";
    categoryError.textContent = "";
    msg.textContent = "";
    msg.className = "";
  };

  /* ---------------------------
     7) Confetti
     --------------------------- */
  function confettiBurst() {
    // Create canvas once per burst, remove after animation
    const c = document.createElement("canvas");
    c.className = "confetti-canvas";
    const ctx = c.getContext("2d");
    document.body.appendChild(c);

    // Fit to viewport
    const fit = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit, { once: true });

    // Particles
    const N = 120;
    const pieces = Array.from({ length: N }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * 40,
      r: 2 + Math.random() * 4,
      vx: -1 + Math.random() * 2,
      vy: 2 + Math.random() * 2.5,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      color: Math.random() > 0.5 ? "#79ffe1" : "#7aa2ff",
    }));

    let t = 0,
      maxT = 75; // ~1s at 60fps
    function tick() {
      t++;
      ctx.clearRect(0, 0, c.width, c.height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      });
      if (t < maxT) requestAnimationFrame(tick);
      else document.body.removeChild(c);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------------------
     8) Submit
     --------------------------- */
  document.querySelector("#entry-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();

    const type = typeHidden.value;
    const amount = parseFloat(amountField.value);
    const note = noteField.value.trim();
    const date = dateField.value;

    let category = "";
    if (type === "expense") category = expenseCategory.value;
    if (type === "income") category = incomeCategory.value;

    let valid = true;
    if (!type) {
      typeError.textContent = "Please select a type.";
      valid = false;
      shake($(seg));
    }
    if (!amount || amount <= 0) {
      amountError.textContent = "Please enter a valid amount.";
      valid = false;
      shake($(amountField));
    }
    if (!category) {
      categoryError.textContent = "Please select a category.";
      valid = false;
    }
    if (!date) {
      dateError.textContent = "Please select a date.";
      valid = false;
    }

    if (!valid) {
      msg.className = "error";
      return;
    }

    const newEntry = { amount, category, note, date };
    const storageKey = type + "s";
    const arr = JSON.parse(localStorage.getItem(storageKey)) || [];

    let isUpdate = false;
    const editType = localStorage.getItem("editType");
    const editIndex = localStorage.getItem("editIndex");
    if (editType && editIndex !== null && editType === type) {
      arr[editIndex] = newEntry;
      isUpdate = true;
      localStorage.removeItem("editType");
      localStorage.removeItem("editIndex");
    } else {
      arr.push(newEntry);
    }
    localStorage.setItem(storageKey, JSON.stringify(arr));

    const text = isUpdate
      ? `${type[0].toUpperCase() + type.slice(1)} updated successfully!`
      : `${type[0].toUpperCase() + type.slice(1)} added successfully!`;

    msg.className = "success";
    msg.textContent = text;

    // Toast + confetti
    toast.stop(true, true).text(text).fadeIn(160).delay(1200).fadeOut(220);
    confettiBurst();

    // Reset & default back to expense; refresh chip
    document.querySelector("#entry-form").reset();
    dateField.value = ISO;
    seg.querySelector('[data-type="expense"]').click();
    updateChip();
  });
});
