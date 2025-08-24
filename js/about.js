"use strict";

/**
 * about.js
 * - Scroll reveal (jQuery fade + slide)
 * - KPI counters from localStorage
 * - FAQ accordion (ARIA-friendly)
 */

$(function () {
  // KPIs from localStorage
  const safe = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k)) || [];
    } catch {
      return [];
    }
  };
  const incomes = safe("incomes");
  const expenses = safe("expenses");

  const sum = (arr) => arr.reduce((s, x) => s + (+x.amount || 0), 0);
  const totalIncome = sum(incomes);
  const totalExpenses = sum(expenses);
  const balance = totalIncome - totalExpenses;
  const entries = incomes.length + expenses.length;

  function countTo($el, to, isMoney = true) {
    $({ v: 0 }).animate(
      { v: to },
      {
        duration: 900,
        easing: "swing",
        step(now) {
          $el.text(
            isMoney
              ? now.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                })
              : Math.round(now).toLocaleString()
          );
        },
        complete() {
          $el.removeClass("skeleton-num");
        },
      }
    );
  }

  countTo($("#kpi-income"), totalIncome, true);
  countTo($("#kpi-expenses"), totalExpenses, true);
  countTo($("#kpi-balance"), balance, true);
  countTo($("#kpi-entries"), entries, false);

  // FAQ accordion
  document.querySelectorAll(".acc-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      const panel = btn.nextElementSibling;
      if (expanded) {
        $(panel).slideUp(180, () => panel.setAttribute("hidden", ""));
      } else {
        panel.removeAttribute("hidden");
        $(panel).hide().slideDown(180);
      }
    });
  });
});
