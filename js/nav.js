// js/nav.js
// Highlights the nav link of the page the user is currently on
const currentFile = window.location.pathname.split("/").pop() || "index.html";

document.querySelectorAll("nav a").forEach(link => {
  if (link.getAttribute("href") === currentFile) {
    link.classList.add("active");
  }
});