"use strict";
/**
 * main.js
 * Dashboard logic + scroll-in animations with jQuery + querySelector
 * - Smooth, throttled reveal animations
 * - Count-up totals for income/expenses/balance
 * - Recent list rendering with safe HTML
 * - Works even if some elements are missing (script reused on other pages)
 */

$(function () {
  // -------------------------------
  // Small helpers (formatters, safety)
  // -------------------------------

  // Escape user-provided strings (protects against HTML injection from localStorage)
  const escapeHtml = (val) =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Currency formatter (2dp, locale-aware)
  const fmtMoney = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Date formatter (robust against invalid dates)
  const fmtDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? ""
      : new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }).format(dt);
  };

  // Parse arrays safely from localStorage
  const safeParse = (key) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };

  // Set footer year if present
  $("#year").text(new Date().getFullYear());

  // -------------------------------
  // Scroll-in animations (throttled)
  // -------------------------------
  // Elements flagged for animation begin slightly translated + transparent
  const $animTargets = $("[data-animate], .card").each(function () {
    $(this).css({ opacity: 0, transform: "translateY(10px)" });
  });

  let rafId = null;
  const onScroll = () => {
    // Use rAF to batch DOM reads/writes for smoother performance
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;

      $animTargets.each(function () {
        const $el = $(this);
        // Skip if already animated once
        if ($el.data("animated")) return;

        const rect = this.getBoundingClientRect();
        const visible = rect.top < window.innerHeight - 80; // threshold
        if (visible) {
          // Slide up (via CSS transform) and fade in (via jQuery)
          $el
            .css({ transform: "translateY(0)" })
            .animate({ opacity: 1 }, 600, () => {
              $el.data("animated", true);
            });
        }
      });
    });
  };

  // Trigger on page load + scroll
  $(window).on("scroll load", onScroll);
  onScroll(); // initial check

  // -------------------------------
  // Dashboard numbers & recent list
  // -------------------------------

  // Query critical nodes; if missing, bail early (lets this file be included on other pages safely)
  const incomeDisplay = document.querySelector("#income");
  const expensesDisplay = document.querySelector("#expenses");
  const balanceDisplay = document.querySelector("#balance");
  const recentList = document.querySelector("#recent-expense-list");
  const emptyState = document.querySelector("#empty-state");

  if (!incomeDisplay || !expensesDisplay || !balanceDisplay || !recentList) {
    // Not the dashboard page; nothing else to do here
    return;
  }

  // Load entries
  const incomes = safeParse("incomes");
  const expenses = safeParse("expenses");

  // Compute totals
  const totalIncome = incomes.reduce((sum, i) => sum + (+i.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (+e.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  /**
   * Count-up animation for numbers using jQuery's animate
   * @param {JQuery} $el - jQuery wrapped number element
   * @param {number} to  - final value
   */
  function animateCount($el, to) {
    const startVal = 0;
    $({ val: startVal }).animate(
      { val: +to },
      {
        duration: 1000,
        easing: "swing",
        step: function (now) {
          $el.text(fmtMoney(now));
        },
        complete: function () {
          // Remove shimmer class if present and set final formatted value
          $el.removeClass("skeleton-num").text(fmtMoney(to));
        },
      }
    );
  }

  // Animate totals
  animateCount($(incomeDisplay), totalIncome);
  animateCount($(expensesDisplay), totalExpenses);
  animateCount($(balanceDisplay), balance);

  // Merge income/expense into a unified, type-tagged list
  const withType = [
    ...incomes.map((item) => ({ ...item, type: "income" })),
    ...expenses.map((item) => ({ ...item, type: "expense" })),
  ];

  // Sort by date descending (robust against invalid dates)
  withType.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
  });

  // Empty state toggle
  if (withType.length === 0) {
    if (emptyState) $(emptyState).fadeIn(200);
    return;
  } else if (emptyState) {
    $(emptyState).hide();
  }

  // Icon by category/type
  const emojiFor = (entry) => {
    if (entry.type === "income") return "💰";
    const map = {
      Food: "🍔",
      Transport: "🚌",
      Utilities: "💡",
      Entertainment: "🎮",
      Shopping: "🛍️",
      Health: "💊",
      Travel: "✈️",
    };
    return map[entry.category] || "💸";
  };

  // Render top 5 entries (sanitized)
  const rows = withType.slice(0, 5).map((entry) => {
    const typeLabel = entry.type === "income" ? "Income" : "Expense";
    const label = escapeHtml(entry.category || typeLabel);
    const noteHtml = entry.note
      ? `<p class="expense-note">${escapeHtml(entry.note)}</p>`
      : "";
    const dateStr = entry.date ? fmtDate(entry.date) : "";
    const sign = entry.type === "income" ? "+" : "-";
    const amountClass =
      entry.type === "income" ? "income-color" : "expense-color";
    const amount = fmtMoney(entry.amount);

    return `
      <div class="expense-card" style="display:none;">
        <div class="expense-left">
          <div class="expense-icon">${emojiFor(entry)}</div>
          <div class="expense-details">
            <h4>${label}</h4>
            <small>${dateStr}</small>
            ${noteHtml}
          </div>
        </div>
        <div class="expense-amount ${amountClass}">
          ${sign}$${amount}
        </div>
      </div>
    `;
  });

  // Inject and animate cards sequentially
  $(recentList).html(rows.join(""));
  $(recentList)
    .children()
    .each(function (i) {
      $(this)
        .delay(i * 120)
        .slideDown(280)
        .css({ opacity: 0 })
        .animate({ opacity: 1 }, 260);
    });
});
