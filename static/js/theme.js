// static/js/theme.js

// Store the media query globally to easily add/remove listener
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function getActualTheme(storedTheme) {
  if (storedTheme === 'system') {
    return prefersDarkScheme.matches ? 'dark' : 'light';
  }
  // Default to 'light' if storedTheme is null, undefined, or not 'dark' (e.g. old invalid values)
  return (storedTheme === 'dark') ? 'dark' : 'light'; 
}

function applyTheme() {
  let storedTheme = localStorage.getItem('theme'); // Can be 'light', 'dark', or 'system'
  if (storedTheme === null) {
      // If no theme is stored (e.g., first visit), default to 'system'.
      storedTheme = 'system';
      // Optionally, save 'system' to localStorage so this becomes the persistent choice
      // until the user manually changes it via the toggle.
      localStorage.setItem('theme', 'system');
  }
  
  const actualThemeToApply = getActualTheme(storedTheme);

  document.documentElement.setAttribute('data-bs-theme', actualThemeToApply);
  document.documentElement.style.colorScheme = actualThemeToApply;

  // Manage system theme listener
  if (storedTheme === 'system') {
    // Add listener only if it's not already there (though modern browsers handle duplicates)
    prefersDarkScheme.removeEventListener('change', handleSystemThemeChange); // Remove first to avoid duplicates if logic is complex
    prefersDarkScheme.addEventListener('change', handleSystemThemeChange);
  } else {
    prefersDarkScheme.removeEventListener('change', handleSystemThemeChange);
  }

  // Apply other visual settings from fireSettings if they exist
  const fireSettingsSaved = localStorage.getItem("fireSettings");
  if (fireSettingsSaved) {
     const settings = JSON.parse(fireSettingsSaved);
     if (settings.fontSize) {
         document.documentElement.style.setProperty("--font-size", settings.fontSize + "px");
         // For Bootstrap 5 body font size, if you transition to this:
         // document.documentElement.style.setProperty("--bs-body-font-size", (parseInt(settings.fontSize) / 16) + "rem");
     }
     if (settings.panelOpacity) {
         // This assumes your CSS uses --panel-alpha for opacity in panel backgrounds
         document.documentElement.style.setProperty("--panel-alpha", settings.panelOpacity);
     }
  }
}

function handleSystemThemeChange() {
  // This function is called when the system theme changes AND 'system' is the selected theme.
  applyTheme(); // Re-apply based on the new system preference
}

function toggleTheme() {
  // When toggling, explicitly set to light or dark, effectively overriding 'system' preference.
  let currentAppliedTheme = document.documentElement.getAttribute('data-bs-theme');
  const newTheme = currentAppliedTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme); // Save the explicit choice
  applyTheme(); // This will also remove the system listener if it was active.
}

// Initial theme application when the script loads
applyTheme();
