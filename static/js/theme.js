// static/js/theme.js
function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

function applyTheme() {
  const storedTheme = localStorage.getItem('theme');
  const fireSettings = JSON.parse(localStorage.getItem("fireSettings")); // For settings page compatibility

  if (storedTheme === 'dark') {
    document.body.classList.add('dark');
  } else if (storedTheme === 'light') {
    document.body.classList.remove('dark');
  } else if (fireSettings && fireSettings.theme === "Modern Dark") { // Compatibility with old settings.html
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark'); // Migrate to new theme key
  } else {
    document.body.classList.remove('dark'); // Default to light
  }

  // Apply font size and panel opacity from fireSettings if they exist
  if (fireSettings) {
    if (fireSettings.fontSize) {
      document.documentElement.style.setProperty("--font-size", fireSettings.fontSize + "px");
      // Also update body font-size directly if not using --font-size variable globally
      document.body.style.fontSize = fireSettings.fontSize + "px";
    }
    if (fireSettings.panelOpacity) {
      // This needs to be applied carefully. The --panel-bg variable includes rgba().
      // We need to reconstruct the rgba string if we want to change only opacity.
      // For simplicity, if settings.html is the only place controlling panel opacity,
      // it can continue to set --panel-bg directly.
      // Or, we define separate variables for panel color and opacity.
      // For now, let settings.html handle its specific --panel-bg update.
      // If other pages need dynamic panel opacity, this needs more thought.
    }
  }
}
