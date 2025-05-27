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
      // This ensures font size is applied even if the --font-size CSS variable is not used everywhere.
      document.body.style.fontSize = fireSettings.fontSize + "px";
    }
    // Note on panelOpacity:
    // The `panelOpacity` setting from `fireSettings` is applied in `settings.html`'s own
    // `applySettings()` function by setting the `--panel-alpha` CSS variable.
    // This `applyTheme()` function (in theme.js) currently does not directly apply panelOpacity,
    // but it's called by settings.html's `applySettings` to handle the base theme and font size.
    // If panelOpacity needed to be applied globally by theme.js without settings.html's intervention,
    // logic to set `--panel-alpha` would be needed here.
    if (fireSettings.panelOpacity) {
      // Example of how it could be applied here if needed:
      // document.documentElement.style.setProperty("--panel-alpha", fireSettings.panelOpacity);
    }
  }
}
