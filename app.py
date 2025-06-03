# /Users/Rakesh/Projects/FIRE_web/Interactive-FIRE-Calculator/app.py
import os
from flask import Flask, request # Ensure request is imported
from flask_babel import Babel, get_locale as flask_babel_get_locale
from babel.numbers import format_currency

# Create the Flask app instance
app = Flask(__name__)
app.testing = True # Ensure testing mode is enabled when app is imported

# Configure Babel
app.config['LANGUAGES'] = {
    'en': 'English',
    'es': 'Spanish'
}
babel = Babel(app)

# Default currency
DEFAULT_CURRENCY = 'USD' # Could be moved to app.config if desired
app.config['DEFAULT_CURRENCY'] = DEFAULT_CURRENCY

# Default configuration values for financial calculations
app.config['DEFAULT_TOLERANCE'] = 0.01
app.config['PV_MAX_GUESS_LIMIT'] = 1_000_000_000
app.config['W_MIN_GUESS_FOR_MAX_EXPENSE'] = 1.0

# --- Configuration ---
# It's good practice to load configuration from environment variables or a config file
# For SECRET_KEY:
default_secret_key = 'your_default_secret_key_for_development_only'
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', default_secret_key)

# Log a warning if the default SECRET_KEY is used in a non-development environment
if app.config['SECRET_KEY'] == default_secret_key and os.environ.get('FLASK_ENV') == 'production':
    app.logger.critical("SECURITY WARNING: Using default SECRET_KEY in production. Set the SECRET_KEY environment variable for security.")
elif app.config['SECRET_KEY'] == default_secret_key:
     app.logger.warning("Using default SECRET_KEY for development. "
                        "Ensure SECRET_KEY environment variable is set for production.")


app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
# Add other app configurations here, e.g., database URI, etc.

# --- Register Routes ---
# Import the registration function from your routes module
# This import is now safe because project.routes no longer imports 'app' at its module level.
from project.routes import register_app_routes

# Call the function to register all routes, passing the app instance
register_app_routes(app)

# --- Babel Locale Selector ---
@babel.localeselector
def get_locale_selector():
    # Use the Accept-Language header to determine the best match.
    # The first part of a language code (e.g., 'en' from 'en-US') is used if specific subtype isn't available.
    # Example: if 'fr-CA' is requested and only 'fr' is available, 'fr' will be chosen.
    return request.accept_languages.best_match(app.config['LANGUAGES'].keys(), default='en')

# Make format_currency, get_locale, and DEFAULT_CURRENCY available in Jinja templates
app.jinja_env.globals['format_currency'] = format_currency
app.jinja_env.globals['get_locale'] = flask_babel_get_locale # Use the one from Flask-Babel for context
app.jinja_env.globals['DEFAULT_CURRENCY'] = app.config['DEFAULT_CURRENCY']


# --- Error Handlers (Optional) ---
# Example:
# @app.errorhandler(404)
# def page_not_found(e):
#     return render_template('404.html'), 404

# --- Main execution ---
if __name__ == '__main__':
    # Host and port can also be configured via environment variables
    host = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))
    print("Attempting to start Flask server...")
    app.run(host=host, port=port, debug=True) # debug=app.config['DEBUG'] is implicitly handled by FLASK_DEBUG env var
