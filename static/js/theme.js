document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseButton = document.getElementById('settings-close-button');
    const themeSelector = document.getElementById('theme-selector');
    const modeToggle = document.getElementById('mode-toggle');
    const modeToggleCircle = document.getElementById('mode-toggle-circle');
    const root = document.documentElement;

    const themes = [
        { name: 'default', label: 'Default' }, { name: 'oceanic', label: 'Oceanic' }, { name: 'forest', label: 'Forest' }, { name: 'sunrise', label: 'Sunrise' }, { name: 'maroon', label: 'Maroon' }, { name: 'amethyst', label: 'Amethyst' }, { name: 'emerald', label: 'Emerald' }, { name: 'slate', label: 'Slate' }, { name: 'tangerine', label: 'Tangerine' }, { name: 'rose', label: 'Rose' }
    ];

    const applySettings = (themeName, modeName) => {
        root.dataset.theme = themeName;
        root.dataset.mode = modeName;
        localStorage.setItem('fire-calc-theme', themeName);
        localStorage.setItem('fire-calc-mode', modeName);

        document.querySelectorAll('.theme-button').forEach(btn => {
            btn.classList.toggle('ring-2', btn.dataset.theme === themeName);
            btn.classList.toggle('ring-[var(--accent-color)]', btn.dataset.theme === themeName);
        });

        const isDark = modeName === 'dark';
        modeToggle.classList.toggle('dark', isDark);
        modeToggleCircle.classList.toggle('translate-x-5', isDark);
    };

    themes.forEach(theme => {
        const button = document.createElement('button');
        button.textContent = theme.label;
        button.dataset.theme = theme.name;
        button.className = 'theme-button w-full text-left p-3 rounded-lg border border-opacity-50 transition-all';
        button.addEventListener('click', () => {
            const currentMode = root.dataset.mode;
            applySettings(theme.name, currentMode);
        });
        themeSelector.appendChild(button);
    });

    modeToggle.addEventListener('click', () => {
        const newMode = root.dataset.mode === 'light' ? 'dark' : 'light';
        const currentTheme = root.dataset.theme;
        applySettings(currentTheme, newMode);
    });

    const savedTheme = localStorage.getItem('fire-calc-theme') || 'default';
    const savedMode = localStorage.getItem('fire-calc-mode') || 'light';
    applySettings(savedTheme, savedMode);

    // Check if settingsButton exists before adding event listener
    if (settingsButton) {
        settingsButton.addEventListener('click', () => settingsModal.classList.add('is-open'));
    }
    // Check if settingsCloseButton exists
    if (settingsCloseButton) {
        settingsCloseButton.addEventListener('click', () => settingsModal.classList.remove('is-open'));
    }
    // Check if settingsModal exists
    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                settingsModal.classList.remove('is-open');
            }
        });
    }
});
