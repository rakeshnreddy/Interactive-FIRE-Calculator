# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
# This is where your code will live inside the container
WORKDIR /app

# Copy the requirements file into the working directory
COPY requirements.txt .

# Install any needed dependencies specified in requirements.txt
# Using --no-cache-dir is a good practice to keep the image size down
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the working directory
COPY . .

# Compile translations
RUN pybabel compile -d project/translations

# Expose the port that your application will listen on.
# Cloud Run (which powers App Hosting backends) expects apps to listen on 8080
EXPOSE 8080

# Run the application using Gunicorn when the container starts
# 'app:app' tells Gunicorn to find the 'app' variable in 'app.py'
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]
