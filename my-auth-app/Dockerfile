FROM python:3.11-slim

# Install Jupyter and other tools
RUN pip install jupyter numpy pandas matplotlib

# Set the working directory
WORKDIR /home/jupyter

# Expose the Jupyter Notebook port
EXPOSE 8888

# Start Jupyter Notebook
CMD ["jupyter", "lab", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root", "--ServerApp.token=", "--ServerApp.password=", "--notebook-dir=/home/jupyter"]
