// Copyright 2026 esyeol
// SPDX-License-Identifier: Apache-2.0
// Keep URLs shared before the multi-page documentation migration working.
function followLegacyFragment() {
  if (document.body.dataset.page !== "overview") return;
  const fragment = window.location.hash.slice(1).replace(/^heading-/, "");
  if (!fragment || fragment === "overview" || fragment === "main") return;
  const apiAnchors = ["track", "parse-tracking", "track-with-raw", "errors"];
  const target = apiAnchors.includes(fragment) ? "api" : fragment;
  const link = [...document.querySelectorAll(".sidebar a[data-page]")].find(
    (item) => item.dataset.page === target,
  );
  if (link)
    window.location.replace(
      `${link.href}${apiAnchors.includes(fragment) ? `#${fragment}` : ""}`,
    );
}
followLegacyFragment();
window.addEventListener("hashchange", followLegacyFragment);
for (const link of document.querySelectorAll("a.language")) {
  link.addEventListener("click", () => {
    link.hash = window.location.hash;
  });
}
