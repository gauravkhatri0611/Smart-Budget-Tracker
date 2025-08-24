"use strict";

/**
 * history.js — Interactive history list
 * - Smooth reveal (no blank page)
 * - Type segmented filter (All/Expense/Income) with sliding pill
 * - Category + sort + search
 * - Mini totals (income/expenses/balance)
 * - jQuery row animations (fade/slide)
 * - Edit/Delete, Clear All, Export CSV
 */

$(function () {
  /* ---------- Reveal [data-animate] immediately ---------- */
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
  const $tbody = $("#expense-table tbody");
  const $msg = $("#history-msg");
  const $empty = $("#empty-state");

  const $category = $("#filter-category");
  const $sort = $("#sort-by");
  const $search = $("#search-text");
  const seg = document.querySelector("#type-filter");
  const segBtns = seg ? Array.from(seg.querySelectorAll(".seg-btn")) : [];
  const segPill = seg ? seg.querySelector(".seg-pill") : null;

  const $income = $("#m-income");
  const $expenses = $("#m-expenses");
  const $balance = $("#m-balance");

  /* ---------- Helpers ---------- */
  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

  function allEntries() {
    let ex = JSON.parse(localStorage.getItem("expenses")) || [];
    let inc = JSON.parse(localStorage.getItem("incomes")) || [];
    ex = ex.map((e, i) => ({ ...e, type: "expense", index: i }));
    inc = inc.map((e, i) => ({ ...e, type: "income", index: i }));
    return [...ex, ...inc];
  }

  /* ---------- Segmented pill ---------- */
  function pillToActive() {
    if (!seg || !segPill) return;
    const active = seg.querySelector(".seg-btn.active") || segBtns[0];
    if (!active) return;
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

  /* ---------- Render ---------- */
  function render() {
    const typeFilter =
      (seg &&
        seg.querySelector(".seg-btn.active")?.getAttribute("data-type")) ||
      "all";
    const cat = $category.val();
    const text = ($search.val() || "").toLowerCase().trim();
    const sort = $sort.val();

    let rows = allEntries();

    // Type filter
    if (typeFilter !== "all") rows = rows.filter((r) => r.type === typeFilter);

    // Category filter
    if (cat && cat !== "All") rows = rows.filter((r) => r.category === cat);

    // Search (category + note)
    if (text) {
      rows = rows.filter((r) => {
        const blob = `${r.category || ""} ${r.note || ""}`.toLowerCase();
        return blob.includes(text);
      });
    }

    // Sort
    switch (sort) {
      case "date-desc":
        rows.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case "date-asc":
        rows.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case "amount-desc":
        rows.sort((a, b) => b.amount - a.amount);
        break;
      case "amount-asc":
        rows.sort((a, b) => a.amount - b.amount);
        break;
    }

    // Totals (unfiltered for global overview)
    const incAll = (JSON.parse(localStorage.getItem("incomes")) || []).reduce(
      (s, i) => s + (+i.amount || 0),
      0
    );
    const exAll = (JSON.parse(localStorage.getItem("expenses")) || []).reduce(
      (s, i) => s + (+i.amount || 0),
      0
    );
    const bal = incAll - exAll;
    $income.text(money(incAll));
    $expenses.text(money(exAll));
    $balance.text(money(bal));

    // Empty state
    if (!rows.length) {
      $tbody.html(
        `<tr><td colspan="6" style="text-align:center; font-style:italic; color:#9aa3b2;">No history found.</td></tr>`
      );
      $empty.fadeIn(120);
      return;
    } else {
      $empty.hide();
    }

    // Build rows
    // Build rows (fixed amount format + better actions layout)
    const html = rows
      .map((e) => {
        const isIncome = e.type === "income";
        const sign = isIncome ? "+" : "-";
        const cls = isIncome ? "income-color" : "expense-color";

        // -> -$100.00 / +$1,000.00 (with thousands separators)
        const amtNum = Number(Math.abs(e.amount) || 0).toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        );
        const amtText = `${sign}$${amtNum}`;

        const prettyDate = e.date ? new Date(e.date).toLocaleDateString() : "";
        const typeLabel = e.type[0].toUpperCase() + e.type.slice(1);

        return `
      <tr style="display:none;">
        <td>${prettyDate}</td>
        <td>${e.category || "-"}</td>
        <td>${e.note || "-"}</td>
        <td class="${cls}">${amtText}</td>
        <td>${typeLabel}</td>
        <td class="table-actions">
          <button class="action-btn edit-btn" data-type="${
            e.type
          }" data-index="${e.index}">Edit</button>
          <button class="action-btn delete-btn" data-type="${
            e.type
          }" data-index="${e.index}">Delete</button>
        </td>
      </tr>`;
      })
      .join("");

    $tbody.html(html);

    // Animate in sequence
    $tbody.children().each(function (i) {
      $(this)
        .delay(i * 40)
        .fadeIn(180);
    });

    // Wire actions
    $(".delete-btn")
      .off("click")
      .on("click", function () {
        const type = $(this).data("type");
        const idx = parseInt($(this).data("index"));
        const key = type + "s";
        const arr = JSON.parse(localStorage.getItem(key)) || [];
        if (arr[idx] == null) return;
        // Slide away row, then remove and re-render
        const $row = $(this).closest("tr");
        $row.fadeOut(160, () => {
          arr.splice(idx, 1);
          localStorage.setItem(key, JSON.stringify(arr));
          showMsg(
            `${type[0].toUpperCase() + type.slice(1)} deleted successfully`,
            "success"
          );
          render();
        });
      });

    $(".edit-btn")
      .off("click")
      .on("click", function () {
        localStorage.setItem("editType", $(this).data("type"));
        localStorage.setItem("editIndex", $(this).data("index"));
        window.location.href = "add-expense.html";
      });
  }

  /* ---------- Export CSV ---------- */
  $("#export-csv").on("click", function () {
    const rows = allEntries();
    if (!rows.length) return;

    const header = ["Date", "Category", "Note", "Amount", "Type"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const date = r.date || "";
      const cat = (r.category || "").replace(/,/g, " ");
      const note = (r.note || "").replace(/,/g, " ");
      const amt = Number(r.amount || 0).toFixed(2);
      lines.push([date, cat, note, amt, r.type].join(","));
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smart-budget-history.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  /* ---------- Clear all ---------- */
  $("#clear-all").on("click", function () {
    if (!confirm("This will delete ALL expenses and incomes. Continue?"))
      return;
    localStorage.removeItem("expenses");
    localStorage.removeItem("incomes");
    showMsg("All history cleared.", "success");
    render();
  });

  /* ---------- UI messages ---------- */
  function showMsg(text, type) {
    $msg.text(text).removeClass().addClass(type);
    setTimeout(() => $msg.text(""), 2200);
  }

  /* ---------- Filter/sort/search listeners ---------- */
  $category.on("change", render);
  $sort.on("change", render);
  $search.on("input", function () {
    // small debounce-like feel
    clearTimeout($(this).data("t"));
    const t = setTimeout(render, 120);
    $(this).data("t", t);
  });

  // initial
  render();
});
