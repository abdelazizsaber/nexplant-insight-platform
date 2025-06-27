
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import mysql.connector
import os
import random
import string
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)

# === CONFIGURATION ===
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'  # Change this to a strong secret in production
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # Session expires in 8 hours

# Enable CORS with credentials
CORS(app, supports_credentials=True, origins=['http://192.168.0.87'])  # Adjust origin as needed

MASTER_DB_CONFIG = {
    'host': 'localhost',
    'user': 'zizo',
    'password': 'Robocon2009!',
    'database': 'nexplant_master'
}

# === HELPERS ===
def generate_company_id(country_code):
    rand_id = ''.join(random.choices(string.digits, k=5))
    return f"{country_code.upper()}_{rand_id}"

def generate_password(length=10):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def get_master_db():
    return mysql.connector.connect(**MASTER_DB_CONFIG)

def get_company_db(company_id):
    config = MASTER_DB_CONFIG.copy()
    config['database'] = company_id
    return mysql.connector.connect(**config)

def session_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
        
        # Verify user still exists and is active
        conn = get_master_db()
        cur = conn.cursor(dictionary=True)
        
        try:
            user = session['user']
            if user.get('role') == 'global_admin':
                cur.execute("SELECT * FROM global_admin WHERE username=%s", (user['username'],))
            else:
                cur.execute("SELECT * FROM users WHERE username=%s AND company_id=%s", 
                          (user['username'], user['company_id']))
            
            current_user = cur.fetchone()
            if not current_user:
                session.clear()
                return jsonify({'error': 'User not found or inactive'}), 401
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
            
        user = session['user']
        if user.get('role') != 'global_admin':
            return jsonify({'error': 'Unauthorized access - Admin only'}), 403
            
        return f(*args, **kwargs)
    
    return decorated

def create_company_database_schema(company_id):
    """Create the database schema for a new company"""
    conn = get_company_db(company_id)
    cur = conn.cursor()
    
    try:
        # Create entities table
        cur.execute("""
            CREATE TABLE entities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                entity_name VARCHAR(255) UNIQUE NOT NULL,
                entity_location VARCHAR(255) NOT NULL,
                entity_description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create devices table
        cur.execute("""
            CREATE TABLE devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                entity_id INT,
                device_name VARCHAR(255) NOT NULL,
                device_id VARCHAR(255) UNIQUE NOT NULL,
                device_type VARCHAR(100) NOT NULL,
                device_description TEXT,
                device_status ENUM('Online', 'Offline') DEFAULT 'Offline',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
            )
        """)
        
        # Create data table for MQTT data
        cur.execute("""
            CREATE TABLE data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                device_id VARCHAR(255) NOT NULL,
                device_type VARCHAR(100) NOT NULL,
                device_data JSON,
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
            )
        """)
        
        conn.commit()
        print(f"Database schema created for company: {company_id}")
        
    except Exception as e:
        conn.rollback()
        print(f"Error creating schema for {company_id}: {str(e)}")
        raise e
    finally:
        conn.close()

def generate_mqtt_listener_script(company_id):
    """Generate MQTT listener script for the company"""
    current_user = getpass.getuser()

    venv_python = "/var/www/nexplant/Backend/venv/python3"
    scripts_dir = Path('/opt/mqtt_scripts')
    script_path = scripts_dir / f"mqtt_listener_{company_id}.py"
    service_path = Path(f"/etc/systemd/system/mqtt_{company_id}.service")

    # Script content
    script_content = f"""
import paho.mqtt.client as mqtt
import mysql.connector
import json
import logging
from datetime import datetime

logging.basicConfig(
    filename='/var/log/mqtt_listener_{company_id}.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

DB_CONFIG = {{
    'host': 'localhost',
    'user': 'zizo',
    'password': 'Robocon2009!',
    'database': '{company_id}'
}}

MQTT_BROKER = 'localhost'
MQTT_PORT = 1883
MQTT_TOPIC = '{company_id}/+'

def on_connect(client, userdata, flags, rc):
    logging.info(f"Connected to MQTT broker with result code {{rc}}")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = msg.payload
        if len(payload) < 16:
            logging.warning("Received payload too short")
            return

        # Parse binary payload
        data_index = payload[0]
        data_value = int.from_bytes(payload[1:5], byteorder='big', signed=False)  # or signed=True if needed
        device_sn = payload[5:16].decode('utf-8', errors='ignore').strip()

        with mysql.connector.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                # Validate device_id
                cur.execute("SELECT device_type FROM devices WHERE device_id = %s", (device_sn,))
                row = cur.fetchone()
                if not row:
                    logging.warning(f"Ignored data for unknown device_id '{device_sn}'")
                    return

                device_type = row[0]

                # Timestamp logic
                if data_index == 0:
                    timestamp_expr = "NOW()"
                else:
                    timestamp_expr = f"NOW() - INTERVAL {data_index} SECOND"

                # Insert into data table
                query = f"INSERT INTO data (device_id, device_type, data_value, timestamp) VALUES (%s, %s, %s, {timestamp_expr})"
                cur.execute(query, (
                    device_sn,
                    device_type,
                    data_value
                ))

                conn.commit()
                logging.info(f"Inserted data for {device_sn} (age={data_index}s, value={data_value})")

    except Exception as e:
        logging.error(f"Error processing message: {e}", exc_info=True)

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()
"""

    # Create script directory and write the Python file
    scripts_dir.mkdir(parents=True, exist_ok=True)
    with open(script_path, 'w') as f:
        f.write(script_content)
    os.chmod(script_path, 0o755)

    # Create systemd service file (no env reference)
    service_content = f"""[Unit]
Description=MQTT Listener for {company_id}
After=network.target

[Service]
Type=simple
User={current_user}
WorkingDirectory={scripts_dir}
ExecStart={venv_python} {script_path}
Restart=always

[Install]
WantedBy=multi-user.target
"""

    with open(service_path, 'w') as f:
        f.write(service_content)

    # Register the service
    subprocess.run(["systemctl", "daemon-reexec"])
    subprocess.run(["systemctl", "daemon-reload"])
    subprocess.run(["systemctl", "enable", f"mqtt_{company_id}.service"])
    subprocess.run(["systemctl", "start", f"mqtt_{company_id}.service"])
    
    print(f"MQTT listener script created: {script_path}")
    return script_path

def send_welcome_email(email, company_id, password):
    """Send welcome email to new company admin"""
    # This is a placeholder - implement actual email sending
    print(f"Welcome email would be sent to {email}")
    print(f"Company ID: {company_id}")
    print(f"Password: {password}")

# === AUTHENTICATION ROUTES ===
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        return jsonify({"error": "Username and password are required"}), 400

    conn = get_master_db()
    cur = conn.cursor(dictionary=True)

    try:
        # First check if it's a global admin
        cur.execute("SELECT * FROM global_admin WHERE username=%s", (username,))
        user = cur.fetchone()
        
        if user and check_password_hash(user['password'], password):
            # Update last login
            cur.execute("UPDATE global_admin SET last_login=NOW() WHERE username=%s", (username,))
            conn.commit()
            
            # Create session
            session.permanent = True
            session['user'] = {
                'username': username,
                'role': 'global_admin',
                'company_id': None
            }
            
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'username': username,
                    'role': 'global_admin',
                    'company_id': None
                }
            }), 200

        # Check regular users
        cur.execute("SELECT * FROM users WHERE username=%s", (username,))
        user = cur.fetchone()
        
        if user and check_password_hash(user['password'], password):
            # Check if company is active
            cur.execute("SELECT company_status FROM companies WHERE company_id=%s", (user['company_id'],))
            company = cur.fetchone()
            
            if not company or company['status'] != 'Active':
                return jsonify({"error": "This account is inactive"}), 403
            
            # Update last login
            cur.execute("UPDATE users SET last_login=NOW() WHERE username=%s", (username,))
            conn.commit()
            
            # Create session
            session.permanent = True
            session['user'] = {
                'username': username,
                'role': user['role'],
                'company_id': user['company_id']
            }
            
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'username': username,
                    'role': user['role'],
                    'company_id': user['company_id']
                }
            }), 200

        return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/auth/check', methods=['GET'])
@session_required
def check_session():
    return jsonify({
        'user': session['user']
    }), 200

# === ADMIN ROUTES ===
@app.route('/api/admin/create_company', methods=['POST'])
@admin_required
def create_company():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    country_code = data.get('country_code')
    description = data.get('description', '')

    if not all([name, email, country_code]):
        return jsonify({"error": "Missing required fields"}), 400

    company_id = generate_company_id(country_code)
    password = generate_password()
    hashed_password = generate_password_hash(password)

    conn = get_master_db()
    cur = conn.cursor(dictionary=True)

    try:
        # Check if company name already exists
        cur.execute("SELECT * FROM companies WHERE company_name=%s", (name,))
        if cur.fetchone():
            return jsonify({"error": "Company name already exists"}), 409

        # Insert company
        cur.execute("""
            INSERT INTO companies (company_id, company_name, company_desc, company_status) 
            VALUES (%s, %s, %s, %s)
        """, (company_id, name, description, 'Active'))

        # Create company admin user
        cur.execute("""
            INSERT INTO users (username, password, company_id, role, status) 
            VALUES (%s, %s, %s, %s, %s)
        """, (email, hashed_password, company_id, 'company_admin', 'Offline'))

        conn.commit()

        # Create company database
        cur.execute(f"CREATE DATABASE `{company_id}`")
        #conn.commit()

        # Create database schema
        create_company_database_schema(company_id)
        
        # Generate MQTT script
        #script_path = generate_mqtt_listener_script(company_id)
        
        # Send welcome email
        send_welcome_email(email, company_id, password)

        return jsonify({
            "message": "Company created successfully",
            "company_id": company_id,
            "admin_email": email,
            "temp_password": password
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/admin/register_device', methods=['POST'])
@admin_required
def register_device():
    data = request.json
    company_id = data.get('company_id')
    device_name = data.get('device_name')
    device_id = data.get('device_id')
    device_type = data.get('device_type')
    description = data.get('description', '')

    if not all([company_id, device_name, device_id, device_type]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        # Get entity ID or create entity
        conn = get_company_db(company_id)
        cur = conn.cursor(dictionary=True)
       
        # Register device
        cur.execute("""
            INSERT INTO devices (device_name, device_id, device_type, device_description, device_status)
            VALUES (%s, %s, %s, %s, 'Offline')
        """, (device_name, device_id, device_type, description))
        
        conn.commit()
        
        return jsonify({
            "message": "Device registered successfully",
            "device_id": device_id,
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/admin/delete_company', methods=['POST'])
@admin_required
def deactivate_company():
    data = request.json
    company_id = data.get('company_id')

    if not company_id:
        return jsonify({"error": "Company ID is required"}), 400

    conn = get_master_db()
    cur = conn.cursor()

    try:
        # Deactivate company (logical deletion)
        cur.execute("UPDATE companies SET status='Disabled' WHERE company_id=%s", (company_id,))
        cur.execute("UPDATE users SET status='Offline' WHERE company_id=%s", (company_id,))
        conn.commit()

        return jsonify({"message": "Company deactivated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# === DATA FETCHING ROUTES ===
@app.route('/api/companies', methods=['GET'])
@session_required
def get_companies():
    conn = get_master_db()
    cur = conn.cursor(dictionary=True)
    
    try:
        cur.execute("SELECT * FROM companies WHERE company_status='Active'")
        companies = cur.fetchall()
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/users', methods=['GET', 'POST'])
@session_required
def handle_users():
    if request.method == 'GET':
        company_id = request.args.get('company_id')
        
        conn = get_master_db()
        cur = conn.cursor(dictionary=True)
        
        try:
            if company_id:
                cur.execute("SELECT username, role, status, last_login FROM users WHERE company_id=%s", (company_id,))
            else:
                cur.execute("SELECT username, role, status, last_login, company_id FROM users")
            
            users = cur.fetchall()
            return jsonify(users), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            conn.close()
    
    elif request.method == 'POST':
        # Create new user
        data = request.json
        username = data.get('username')
        password = data.get('password')
        company_id = data.get('company_id')
        role = data.get('role')
        
        if not all([username, password, company_id, role]):
            return jsonify({"error": "Missing required fields"}), 400
        
        hashed_password = generate_password_hash(password)
        
        conn = get_master_db()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO users (username, password, company_id, role, status)
                VALUES (%s, %s, %s, %s, 'Active')
            """, (username, hashed_password, company_id, role))
            conn.commit()
            
            return jsonify({"message": "User created successfully"}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            conn.close()

@app.route('/api/devices', methods=['GET'])
@session_required
def get_devices():
    user = session['user']
    devices = []

    try:
        if user['role'] == 'global_admin':
            # Get list of companies from master DB
            master_conn = get_master_db()
            master_cur = master_conn.cursor(dictionary=True)
            master_cur.execute("SELECT company_id FROM companies WHERE company_status='Active'")
            companies = master_cur.fetchall()
            master_conn.close()

            if not companies:
                return jsonify([]), 200  # No companies found → return empty list

            for company in companies:
                try:
                    conn = get_company_db(company['company_id'])
                    cur = conn.cursor(dictionary=True)

                    # Skip if 'devices' table doesn't exist
                    cur.execute("""
                        SELECT COUNT(*) AS table_exists 
                        FROM information_schema.tables 
                        WHERE table_schema = DATABASE() AND table_name = 'devices'
                    """)
                    if cur.fetchone()['table_exists'] == 0:
                        continue

                    cur.execute("""
                        SELECT * FROM devices 
                    """)
                    company_devices = cur.fetchall()

                    for dev in company_devices:
                        dev['company_id'] = company['company_id']
                    devices.extend(company_devices)

                except Exception as e:
                    # Log and skip broken or misconfigured DBs
                    logging.exception(f"Error accessing company {company['company_id']}")
                finally:
                    if 'conn' in locals():
                        conn.close()

        else:
            company_id = user['company_id']
            try:
                conn = get_company_db(company_id)
                cur = conn.cursor(dictionary=True)

                # Skip if 'devices' table doesn't exist
                cur.execute("""
                    SELECT COUNT(*) AS table_exists 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() AND table_name = 'devices'
                """)
                if cur.fetchone()['table_exists'] == 0:
                    return jsonify([]), 200

                cur.execute("""
                    SELECT * FROM devices
                """)
                devices = cur.fetchall()
                for dev in devices:
                    dev['company_id'] = company_id

            except Exception as e:
                logging.exception(f"Error accessing devices for company {company_id}")
                return jsonify([]), 200  # Don't raise an error — just return empty
            finally:
                if 'conn' in locals():
                    conn.close()

    except Exception as e:
        logging.exception("Unexpected error in /api/devices")
        return jsonify([]), 200  # Again, return empty list, not error

    return jsonify(devices), 200

@app.route('/api/entities', methods=['GET', 'POST'])
@session_required
def handle_entities():
    if request.method == 'GET':
        company_id = request.args.get('company_id')
        user = session['user']
        
        # If not global admin, restrict to user's company
        if user['role'] != 'global_admin':
            company_id = user['company_id']
        
        if not company_id:
            return jsonify({"error": "Company ID is required"}), 400
        
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor(dictionary=True)
            
            cur.execute("SELECT * FROM entities")
            entities = cur.fetchall()
            
            return jsonify(entities), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()
    
    elif request.method == 'POST':
        # Create new entity
        data = request.json
        company_id = data.get('company_id')
        entity_name = data.get('entity_name')
        entity_location = data.get('entity_location')
        entity_description = data.get('entity_description', '')
        
        user = session['user']
        
        # If not global admin, restrict to user's company
        if user['role'] != 'global_admin':
            company_id = user['company_id']
        
        if not all([company_id, entity_name, entity_location]):
            return jsonify({"error": "Missing required fields"}), 400
        
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO entities (entity_name, entity_location, entity_description)
                VALUES (%s, %s, %s)
            """, (entity_name, entity_location, entity_description))
            conn.commit()
            
            return jsonify({"message": "Entity created successfully"}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()

@app.route('/api/device-data/<device_id>', methods=['GET'])
@session_required
def get_device_data(device_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    user = session['user']
    company_id = user['company_id']
    
    if not company_id:
        return jsonify({"error": "Company ID is required"}), 400
    
    try:
        conn = get_company_db(company_id)
        cur = conn.cursor(dictionary=True)
        
        query = "SELECT * FROM data WHERE device_id=%s"
        params = [device_id]
        
        if start_date:
            query += " AND timestamp >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND timestamp <= %s"
            params.append(end_date)
        
        query += " ORDER BY timestamp DESC LIMIT 1000"
        
        cur.execute(query, params)
        data = cur.fetchall()
        
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)