from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_world():
    # Basic logging to confirm it's reached
    app.logger.info("Minimal app's hello_world route was reached.")
    return "Hello, World! This is the minimal test app."

@app.route('/healthz') # Health check endpoint
def health_check():
    app.logger.info("Minimal app's health_check route was reached.")
    return "OK", 200

if __name__ == '__main__':
    # This part is mainly for local execution, Gunicorn will use `app:app`
    app.run(host='0.0.0.0', port=8080, debug=True)
