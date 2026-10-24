/**
 * CodeAlpha Commercial AI Chatbot Widget Loader (Enterprise Edition)
 * Automatically redirects to or executes the main Shadow-DOM encapsulated widget bundle.
 */

// If static/widget.js is also loaded, do nothing
if (typeof window !== "undefined" && !window.CodeAlphaWidgetLoaded) {
  const currentScript = document.currentScript || (function () {
    const scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  const apiUrl = (currentScript && currentScript.getAttribute("data-api-url")) || window.location.origin;

  // Load the main widget script if not already present
  const script = document.createElement("script");
  script.src = `${apiUrl}/static/widget.js`;
  if (currentScript && currentScript.getAttribute("data-api-url")) {
    script.setAttribute("data-api-url", currentScript.getAttribute("data-api-url"));
  }
  document.head.appendChild(script);
}
