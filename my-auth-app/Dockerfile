FROM python:3.11-slim

# Install Jupyter, AWS CLI, and other tools
RUN pip install jupyter pandas numpy matplotlib scikit-learn awscli

# Set the working directory
WORKDIR /home/jupyter

# Copy auto-sync script
COPY auto-sync.sh /usr/local/bin/auto-sync.sh
RUN chmod +x /usr/local/bin/auto-sync.sh

# Expose the Jupyter Notebook port
EXPOSE 8888

# Start auto-sync and Jupyter Lab
CMD /usr/local/bin/auto-sync.sh & \
    cd /home/jupyter && \ 
    jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root \
    --ServerApp.token='' --ServerApp.password='' --notebook-dir="/home/jupyter"