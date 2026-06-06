document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseButton = document.getElementById('settings-close-button');
    const settingsButtonMobile = document.getElementById('settings-button-mobile');
    const themeSelector = document.getElementById('theme-selector');
    const modeToggle = document.getElementById('mode-toggle');
    const modeToggleCircle = document.getElementById('mode-toggle-circle');
    const root = document.documentElement;

    const themes = [
        { name: 'aurora', label: 'Aurora' },
        { name: 'lagoon', label: 'Lagoon' },
        { name: 'ember', label: 'Ember' }
    ];

    const normalizeTheme = (themeName) => {
        return themes.some(theme => theme.name === themeName) ? themeName : 'aurora';
    };

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
        if (modeToggle) {
            modeToggle.classList.toggle('dark', isDark);
        }
        if (modeToggleCircle) {
            modeToggleCircle.classList.toggle('translate-x-5', isDark);
        }
    };

    if (themeSelector) {
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
    }

    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            const newMode = root.dataset.mode === 'light' ? 'dark' : 'light';
            const currentTheme = normalizeTheme(root.dataset.theme);
            applySettings(currentTheme, newMode);
        });
    }

    const savedTheme = normalizeTheme(localStorage.getItem('fire-calc-theme') || 'aurora');
    const savedMode = localStorage.getItem('fire-calc-mode') || 'light';
    applySettings(savedTheme, savedMode);

    const mobileNavButton = document.getElementById('mobile-nav-button');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    if (mobileNavButton && mobileNavMenu) {
        mobileNavButton.addEventListener('click', () => {
            const isOpen = mobileNavButton.getAttribute('aria-expanded') === 'true';
            mobileNavButton.setAttribute('aria-expanded', String(!isOpen));
            mobileNavMenu.hidden = isOpen;
        });
    }

    // Check if settingsButton exists before adding event listener
    if (settingsButton) {
        settingsButton.addEventListener('click', () => settingsModal.classList.add('is-open'));
    }
    if (settingsButtonMobile) {
        settingsButtonMobile.addEventListener('click', () => {
            settingsModal.classList.add('is-open');
            const mobileNavButton = document.getElementById('mobile-nav-button');
            const mobileNavMenu = document.getElementById('mobile-nav-menu');
            if (mobileNavButton && mobileNavMenu) {
                mobileNavButton.setAttribute('aria-expanded', 'false');
                mobileNavMenu.hidden = true;
            }
        });
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
