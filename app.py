import os
import logging # Make sure logging is imported
from flask import Flask, request # request for get_locale_selector
from flask_wtf.csrf import CSRFProtect
from flask_babel import Babel, get_locale as flask_babel_get_locale
from babel.numbers import format_currency

# Create the Flask app instance
app = Flask(__name__)
app.testing = True # Ensure testing mode is enabled when app is imported
csrf = CSRFProtect(app)
app.jinja_env.add_extension('jinja2.ext.do') # <-- ADD THIS LINE

# Basic app logging
if not app.debug:
    app.logger.setLevel(logging.INFO) # Or logging.DEBUG
app.logger.info("Flask app initialized.")

# --- Babel Locale Selector Function (must be defined before Babel initialization) ---
def get_locale_selector(): # No decorator here
    app.logger.debug("Attempting to get locale in get_locale_selector.")
    selected_locale = request.accept_languages.best_match(app.config['LANGUAGES'].keys(), default='en')
    app.logger.debug(f"Locale selected by best_match: {selected_locale}")
    return selected_locale

# Configure Babel
app.config['LANGUAGES'] = {
    'en': 'English',
    'es': 'Spanish'
}
# Initialize Babel with the locale selector
babel = Babel(app, locale_selector=get_locale_selector) # Pass the function here
app.logger.info("Flask-Babel initialized with locale_selector.") # Log moved after actual init
app.logger.info(f"Configured languages: {app.config.get('LANGUAGES')}")


# Default currency
DEFAULT_CURRENCY = 'USD'
app.config['DEFAULT_CURRENCY'] = DEFAULT_CURRENCY
app.logger.info(f"Default currency: {app.config.get('DEFAULT_CURRENCY')}")

# Default configuration values for financial calculations
app.config['DEFAULT_TOLERANCE'] = 0.01
app.config['PV_MAX_GUESS_LIMIT'] = 1_000_000_000
app.config['W_MIN_GUESS_FOR_MAX_EXPENSE'] = 1.0

# --- Configuration ---
default_secret_key = 'your_default_secret_key_for_development_only'
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', default_secret_key)

if app.config['SECRET_KEY'] == default_secret_key and os.environ.get('FLASK_ENV') == 'production':
    app.logger.critical("SECURITY WARNING: Using default SECRET_KEY in production. Set the SECRET_KEY environment variable for security.")
elif app.config['SECRET_KEY'] == default_secret_key:
     app.logger.warning("Using default SECRET_KEY for development. Ensure SECRET_KEY environment variable is set for production.")

app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'

# --- Register Routes ---
from project.routes import register_app_routes
from project.wizard_routes import wizard_bp # <--- ADD THIS IMPORT

register_app_routes(app)
app.register_blueprint(wizard_bp) # <--- ADD THIS LINE TO REGISTER THE BLUEPRINT
app.logger.info("Application routes and wizard blueprint registered.") # Update log message

# Make format_currency, get_locale, and DEFAULT_CURRENCY available in Jinja templates
app.jinja_env.globals['format_currency'] = format_currency
app.jinja_env.globals['get_locale'] = flask_babel_get_locale # Use the one from Flask-Babel for context
app.jinja_env.globals['DEFAULT_CURRENCY'] = app.config['DEFAULT_CURRENCY']
app.logger.info("Jinja globals for Babel set.")

# --- Health Check Endpoint ---
@app.route('/healthz')
def health_check():
    app.logger.info("Health check route /healthz was reached.")
    return "OK", 200

# --- Main execution (for local development) ---
if __name__ == '__main__':
    host = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))
    # Note: app.logger might not be fully configured here for local `app.run`
    # Gunicorn will handle logging in production based on Dockerfile CMD.
    print(f"Attempting to start Flask server on {host}:{port} for local development...")
    app.run(host=host, port=port, debug=app.config['DEBUG'])
