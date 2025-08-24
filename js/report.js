"use strict";

/**
 * report.js — Category report with smooth UI
 * - Animated totals (jQuery count-up)
 * - Month filter (input[type="month"])
 * - Segmented view (both / expenses / income)
 * - Category text filter
 * - Gradient bars, soft animations
 * - Export CSV + Download PNG
 */

$(function () {
  /* ---------- Reveal page ---------- */
  function reveal() {
    $("[data-animate]").each(function () {
      const $el = $(this);
      const threshold = $(window).scrollTop() + $(window).height() - 60;
      if ($el.offset().top < threshold) $el.addClass("show");
    });
  }
  reveal();
  $(window).on("load scroll", reveal);

  /* ---------- Cache ---------- */
  const $inc = $("#r-income");
  const $exp = $("#r-expenses");
  const $bal = $("#r-balance");
  const $msg = $("#report-msg");
  const $empty = $("#report-empty");

  const monthInput = document.querySelector("#month-filter");
  const searchCat = document.querySelector("#search-cat");
  const seg = document.querySelector("#view-type");
  const segBtns = seg ? Array.from(seg.querySelectorAll(".seg-btn")) : [];
  const segPill = seg ? seg.querySelector(".seg-pill") : null;

  const canvas = document.querySelector("#category-chart");
  const ctx = canvas.getContext("2d");
  let chart; // Chart.js instance

  /* ---------- Helpers ---------- */

  const yyyyMm = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // default month = current month
  if (!monthInput.value) monthInput.value = yyyyMm(new Date());

  function getData() {
    const ex = JSON.parse(localStorage.getItem("expenses")) || [];
    const inc = JSON.parse(localStorage.getItem("incomes")) || [];
    return { ex, inc };
  }

  /* ---------- Seg pill ---------- */
  function pillToActive() {
    if (!seg || !segPill) return;
    const active = seg.querySelector(".seg-btn.active") || segBtns[0];
    const s = seg.getBoundingClientRect();
    const b = active.getBoundingClientRect();
    const left = b.left - s.left + 6;
    const width = b.width;
    seg.classList.add("ready");
    $(segPill)
      .stop(true, true)
      .animate({ left, width }, { duration: 260, easing: "swing" });
  }
  setTimeout(pillToActive, 0);
  $(window).on("resize", pillToActive);

  seg?.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    segBtns.forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-selected", b === btn ? "true" : "false");
    });
    pillToActive();
    render();
  });

  /* ---------- Build dataset by category with filters ---------- */
  function build() {
    const { ex, inc } = getData();

    // filter by selected month
    const mm = monthInput.value; // "YYYY-MM"
    const inMonth = (iso) => !mm || (iso && iso.startsWith(mm));

    // filter by category text
    const q = (searchCat.value || "").toLowerCase().trim();
    const catMatch = (cat) => !q || (cat || "").toLowerCase().includes(q);

    const expTotals = {};
    const incTotals = {};
    let totalExp = 0;
    let totalInc = 0;

    ex.forEach((e) => {
      if (!inMonth(e.date) || !catMatch(e.category)) return;
      expTotals[e.category] = (expTotals[e.category] || 0) + (+e.amount || 0);
      totalExp += +e.amount || 0;
    });

    inc.forEach((i) => {
      if (!inMonth(i.date) || !catMatch(i.category)) return;
      incTotals[i.category] = (incTotals[i.category] || 0) + (+i.amount || 0);
      totalInc += +i.amount || 0;
    });

    const cats = Array.from(
      new Set([...Object.keys(expTotals), ...Object.keys(incTotals)])
    );
    cats.sort();

    const expenseData = cats.map((c) => expTotals[c] || 0);
    const incomeData = cats.map((c) => incTotals[c] || 0);

    return { cats, expenseData, incomeData, totalExp, totalInc };
  }

  /* ---------- Animate numbers ---------- */
  function countTo($el, to) {
    $({ v: 0 }).animate(
      { v: to },
      {
        duration: 900,
        easing: "swing",
        step(now) {
          $el.text(
            Number(now).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
            })
          );
        },
      }
    );
  }

  /* ---------- Render Chart ---------- */
  function render() {
    const view =
      seg?.querySelector(".seg-btn.active")?.getAttribute("data-view") ||
      "both";
    const { cats, expenseData, incomeData, totalExp, totalInc } = build();

    // totals (global for the filtered month+category)
    const bal = totalInc - totalExp;
    countTo($exp, totalExp);
    countTo($inc, totalInc);
    countTo($bal, bal);

    if (
      !cats.length ||
      (view === "expenses" && expenseData.every((n) => n === 0)) ||
      (view === "income" && incomeData.every((n) => n === 0))
    ) {
      $("#category-chart").hide();
      $empty.fadeIn(120);
      return;
    } else {
      $empty.hide();
      $("#category-chart").show();
    }

    // Gradients
    const gradExp = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradExp.addColorStop(0, "rgba(255,100,124,0.95)");
    gradExp.addColorStop(1, "rgba(255,100,124,0.45)");

    const gradInc = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradInc.addColorStop(0, "rgba(121,255,225,0.95)");
    gradInc.addColorStop(1, "rgba(121,255,225,0.45)");

    // datasets based on view
    const ds = [];
    if (view !== "income") {
      ds.push({
        label: "Expenses",
        data: expenseData,
        backgroundColor: gradExp,
        borderRadius: 8,
        barThickness: "flex",
      });
    }
    if (view !== "expenses") {
      ds.push({
        label: "Income",
        data: incomeData,
        backgroundColor: gradInc,
        borderRadius: 8,
        barThickness: "flex",
      });
    }

    // (Re)draw
    if (chart) {
      chart.data.labels = cats;
      chart.data.datasets = ds;
      chart.update();
    } else {
      chart = new Chart(ctx, {
        type: "bar",
        data: { labels: cats, datasets: ds },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          animation: { duration: 600 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const v = Number(ctx.raw || 0).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                  });
                  return ` ${ctx.dataset.label}: ${v}`;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "#111827" },
              grid: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: "#111827",
                callback: (v) =>
                  Number(v).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  }),
              },
              grid: { color: "rgba(0,0,0,.06)" },
            },
          },
        },
      });
    }

    $msg.text(
      `Showing ${view === "both" ? "income & expenses" : view} for ${
        monthInput.value
      }`
    );
  }

  /* ---------- Export CSV ---------- */
  $("#export-csv").on("click", function () {
    const { cats, expenseData, incomeData } = build();
    if (!cats.length) return;

    const header = ["Category", "Expenses", "Income"];
    const lines = [header.join(",")];
    cats.forEach((c, i) => {
      lines.push(
        [
          (c || "").replace(/,/g, " "),
          Number(expenseData[i] || 0).toFixed(2),
          Number(incomeData[i] || 0).toFixed(2),
        ].join(",")
      );
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-budget-report-${monthInput.value}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  /* ---------- Download PNG ---------- */
  $("#download-chart").on("click", function () {
    if (!chart) return;
    const link = document.createElement("a");
    link.href = chart.toBase64Image();
    link.download = `smart-budget-chart-${monthInput.value}.png`;
    link.click();
  });

  /* ---------- Listeners ---------- */
  monthInput.addEventListener("change", render);
  searchCat.addEventListener("input", () => {
    clearTimeout($(searchCat).data("t"));
    const t = setTimeout(render, 150);
    $(searchCat).data("t", t);
  });

  // initial
  render();
});
