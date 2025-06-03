# project/Dockerfile

# Use an official lightweight Python image as the base image
FROM python:3.9-slim

# Set the working directory inside the container.
# Cloud Build/App Hosting mounts your source code at /workspace.
WORKDIR /workspace

# Copy the requirements.txt file from the repository root
# to the working directory in the container.
# We copy it separately before the rest of the code to leverage Docker caching.
COPY requirements.txt .

# Install the Python dependencies from requirements.txt
# Use --no-cache-dir to keep the image size down.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code from the repository root
# to the working directory in the container.
# This includes your 'project/' directory and 'run.py'.
COPY . .

# Expose the port your application will run on.
# Cloud environments typically use port 8080.
EXPOSE 8080

# Add gunicorn to your requirements.txt if it's not already there!
# This is a production-ready WSGI server to run your Flask app.
# The command below assumes your Flask application instance
# is named 'app' and can be found/run via the 'run.py' script.
# If your app is structured differently (e.g., app = Flask(...) in project/__init__.py),
# you might need to adjust 'run:app' to 'project:app'.
CMD ["gunicorn", "--bind", ":8080", "run:app"]
