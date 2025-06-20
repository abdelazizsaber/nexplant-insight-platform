
#!/bin/bash

# Setup script for NexPlant Backend

echo "Setting up NexPlant Backend..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Create directories
mkdir -p mqtt_scripts
mkdir -p logs

echo "Setup complete!"
echo "1. Make sure MySQL is running"
echo "2. Update database credentials in app.py"
echo "3. Run the database_schema.sql to create master database"
echo "4. Update the global admin password in the database"
echo "5. Start the server with: python app.py"
