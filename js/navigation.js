/**
 * navigation.js
 * Site-wide UI polish (jQuery)
 * - Highlight active nav link
 * - Header elevation on scroll (adds .scrolled)
 * - Animated "ink" underline in nav on hover
 * - Footer: back-to-top + newsletter demo submit
 */

"use strict";

$(function () {
  // -------------------------------
  // Active link highlight
  // -------------------------------
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  $(".nav-list a").each(function () {
    const $a = $(this);
    if ($a.attr("href") === currentPage) {
      $a.addClass("active");
    }
  });

  // -------------------------------
  // Header elevation on scroll
  // -------------------------------
  const $header = $(".main-header");
  let revealed = false;

  const applyHeaderState = () => {
    const scrolled = window.scrollY > 6;
    $header.toggleClass("scrolled", scrolled);

    // One-time gentle reveal when user starts scrolling
    if (scrolled && !revealed) {
      revealed = true;
      $header
        .css({ opacity: 0, transform: "translateY(-6px)" })
        .animate({ opacity: 1 }, 220)
        .css({ transform: "translateY(0)" });
    }
  };

  applyHeaderState();
  $(window).on("scroll", applyHeaderState);

  // -------------------------------
  // Animated nav underline ("ink")
  // -------------------------------
  const $nav = $(".nav-list");
  if ($nav.length) {
    // Create underline once and append
    const $ink = $("<span class='nav-ink' />").appendTo($nav);

    /**
     * Reposition underline under target link
     * Uses .position() within the relatively-positioned .nav-list container
     */
    const moveInk = ($el) => {
      if (!$el || !$el.length) return;
      const off = $el.position();
      $ink.css({
        width: $el.outerWidth(),
        left: off.left,
        top: $el.outerHeight() + off.top - 2,
      });
    };

    // Initialize under the active link (if any), otherwise the first link
    const $active = $nav.find("a.active").first();
    moveInk($active.length ? $active : $nav.find("a").first());

    // Hover animation
    $nav.on("mouseenter", "a", function () {
      moveInk($(this));
    });

    // On mouse leave, return to the active link position (if any)
    $nav.on("mouseleave", function () {
      if ($active.length) moveInk($active);
    });

    // Reposition underline on resize to keep alignment correct
    let resizeRaf = null;
    $(window).on("resize", function () {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        if ($active.length) moveInk($active);
      });
    });
  }

  // -------------------------------
  // Footer interactions
  // -------------------------------

  // Back-to-top smooth scroll
  $("#back-to-top").on("click", function () {
    $("html, body").animate({ scrollTop: 0 }, 450, "swing");
  });

  // Newsletter demo submit (front-end only)
  $("#newsletter-form").on("submit", function (e) {
    e.preventDefault();

    const $msg = $("#nl-msg");
    const email = ($("#nl-email").val() || "").trim();

    // Very basic email validation
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      $msg.text("Please enter a valid email.");
      return;
    }

    // Fake async "subscribe"
    $msg.text("Subscribing...");
    setTimeout(() => {
      $msg.text("You're in! 🎉 Check your inbox for a confirmation email.");
      $("#nl-email").val("");
    }, 600);
  });
});
