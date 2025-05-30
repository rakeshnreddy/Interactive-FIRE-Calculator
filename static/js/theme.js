// static/js/theme.js
function applyTheme() {
  let theme = localStorage.getItem('theme');
  const fireSettings = JSON.parse(localStorage.getItem("fireSettings")); // For settings page compatibility

  // Compatibility with old settings.html theme selection if new 'theme' is not set
  if (!theme && fireSettings && fireSettings.theme === "Modern Dark") {
    theme = 'dark';
    localStorage.setItem('theme', 'dark'); // Migrate to new theme key
  }
  
  // Default to 'light' if no theme is stored or resolved from old settings
  if (theme !== 'dark' && theme !== 'light') {
    theme = 'light';
    // Optionally save the default if it wasn't set
    // localStorage.setItem('theme', theme); 
  }

  document.documentElement.setAttribute('data-bs-theme', theme);
  document.documentElement.style.colorScheme = theme;

  // Apply font size from fireSettings if they exist
  // Panel opacity is handled by settings.html's applyPageSpecificSettings
  if (fireSettings && fireSettings.fontSize) {
    // Using --bs-body-font-size for Bootstrap 5 compatibility if possible,
    // or a custom variable like --font-size if main.css is set up for it.
    // Assuming --font-size is still used by custom CSS parts not covered by BS utility classes.
    document.documentElement.style.setProperty("--font-size", fireSettings.fontSize + "px");
    // For direct Bootstrap body font size, if needed:
    // document.documentElement.style.setProperty("--bs-body-font-size", (parseInt(fireSettings.fontSize) / 16) + "rem");
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  applyTheme();
}

// Initial theme application when the script loads
applyTheme();
