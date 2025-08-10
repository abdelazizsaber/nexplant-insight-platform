
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import mysql.connector
import os
import random
import string
from datetime import datetime, time, timedelta, date
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
import logging
from collections import defaultdict


app = Flask(__name__)

# === CONFIGURATION ===
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'  # Change this to a strong secret in production
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # Session expires in 8 hours

# Enable CORS with credentials
CORS(app, supports_credentials=True, origins=['http://10.0.1.73'])  # Adjust origin as needed

MASTER_DB_CONFIG = {
    'host': 'localhost',
    'user': 'zizo',
    'password': 'Robocon2009!',
    'database': 'nexplant_master'
}

logging.basicConfig(filename='/var/www/nexplant/Backend/nexplant.log', level=logging.DEBUG, 
                    format='%(asctime)s %(levelname)s %(name)s %(message)s')
logger=logging.getLogger(__name__)

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
                device_data DECIMAL(10,2),
                rated_speed DECIMAL(10,2),
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
            )
        """)
        
        # Create data table for shifts
        cur.execute("""
            CREATE TABLE shifts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                shift_name VARCHAR(50),
                start_time TIME,
                end_time TIME
            )
        """)
        
        # Create data table for products
        cur.execute("""
            CREATE TABLE products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_name VARCHAR(255),
                product_description TEXT,
                rated_speed DECIMAL(10,2)
            )
        """)
        
        # Create data table for production schedule
        cur.execute("""
            CREATE TABLE production_schedule (
                schedule_id INT AUTO_INCREMENT PRIMARY KEY,
                schedule_name VARCHAR(255) UNIQUE NOT NULL,
                device_id VARCHAR(255),
                product_id INT,
                rated_speed DECIMAL(10,2),
                shift_id INT,
                modification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                start_datetime DATETIME,
                end_datetime DATETIME,
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
            )
        """)
        
        # Create downtime table
        cur.execute("""
            CREATE TABLE production_downtime (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id VARCHAR(255),
                product_id INT,
                shift_id INT,
                start_datetime DATETIME,
                end_datetime DATETIME,
                comment TEXT,
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
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



def send_welcome_email(email, company_id, password):
    """Send welcome email to new company admin"""
    # This is a placeholder - implement actual email sending
    print(f"Welcome email would be sent to {email}")
    print(f"Company ID: {company_id}")
    print(f"Password: {password}")
    
    # To REMOVE!!!
    
    # Define paths
    env_path = Path("/var/www/nexplant/Backend")
    env_file_path = env_path / f"{company_id}.env"
    
    # Write password to file
    try:
        with open(env_file_path, "a") as f:
            f.write("USERNAME=" + email + "\n")
            f.write("PASSWORD=" + password)
        print(f"Env file generated")
    except Exception as e:
        print(f"Failed to write to file: {e}")
    
def time_to_minutes(t):
    return t.hour * 60 + t.minute

def timedelta_to_time(td: timedelta):
    return (datetime.min + td).time()

def is_within_shift(shift_start, shift_end, prod_start, prod_end):
    s_start = time_to_minutes(shift_start)
    s_end = time_to_minutes(shift_end)
    p_start = time_to_minutes(prod_start)
    p_end = time_to_minutes(prod_end)

    if s_end <= s_start:  # Overnight shift (e.g., 22:00 → 06:00)
        s_end += 1440
        if p_end <= p_start:
            p_end += 1440
        if p_start < s_start:
            p_start += 1440

    return s_start <= p_start and p_end <= s_end    
    
def get_current_shift_boundry_timestamps(company_id):
    """
    Get the current operating shift start time from the shifts table, handling midnight crossings.
    
    Args:
        company_id (): the company ID
        
    Returns:
        dict: The current shift record or None if no matching shift found
    """
    try:
        # Connect to MySQL database
        conn = get_company_db(company_id)
        cur = conn.cursor(dictionary=True)
        
        # Get used datetime
        now = datetime.now().time()
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)
        midnight = datetime.strptime('00:00:00', "%H:%M:%S").time()
        
        # Query all shifts from the database
        cur.execute("SELECT * FROM shifts")
        shifts = cur.fetchall()
        
        # Find the current shift
        for shift in shifts:
            # Convert MySQL timedelta to time object
            start_time = (datetime.min + shift['start_time']).time()
            end_time = (datetime.min + shift['end_time']).time()
            
            # Handle shifts that cross midnight
            if start_time > end_time:
                # Current shift if now >= start_time OR now < end_time
                if now >= start_time or now < end_time:
                    if now >= midnight:
                        # We are already after midnight, we need to indicate yesterday date for start and today for end
                        shift_start_timestamp = datetime.combine(yesterday, start_time)
                        shift_end_timestamp = datetime.combine(today, end_time)
                    else:
                        # We are still before midnight, we need to indicate today date for start and tomorrow for end
                        shift_start_timestamp = datetime.combine(today, start_time)
                        shift_end_timestamp = datetime.combine(tomorrow, end_time)
                        
                    return {
                        'start_timestamp': shift_start_timestamp,
                        'end_timestamp': shift_end_timestamp,
                    }
            else:
                # Normal shift (not crossing midnight)
                if start_time <= now < end_time:
                    shift_start_timestamp = datetime.combine(today, start_time)
                    shift_end_timestamp = datetime.combine(today, end_time)
                    return {
                        'start_timestamp': shift_start_timestamp,
                        'end_timestamp': shift_end_timestamp,
                    }
        
        return None  # No matching shift found
        
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return None
    finally:
        if 'conn' in locals() and conn.is_connected():
            cur.close()
            conn.close()
            
def calculate_downtime(company_id, min_downtime_minutes=5):
    """
    Calculate downtime per production schedule
    Insert downtime periods into production_downtime table.
    """
    try:
        conn = get_company_db(company_id)
        cur = conn.cursor(dictionary=True)

        # Get all active and past schedules
        cur.execute("""
            SELECT ps.*, d.device_name, p.product_name, s.shift_name
            FROM production_schedule ps
            JOIN devices d ON ps.device_id = d.device_id
            JOIN products p ON ps.product_id = p.id
            JOIN shifts s ON ps.shift_id = s.id
            WHERE ps.start_datetime <= NOW()
            ORDER BY ps.device_id, ps.start_datetime
        """)
        schedules = cur.fetchall()
        if not schedules:
            return True

        downtime_records = []

        for schedule in schedules:
            device_id = schedule['device_id']
            product_id = schedule['product_id']
            shift_id = schedule['shift_id']
            start_dt = schedule['start_datetime']
            end_dt = min(datetime.now(), schedule['end_datetime'])

            # Get data for this schedule time range         
            cur.execute("""
            SELECT device_id, timestamp, device_data
            FROM data
            WHERE device_id = (%s)
            AND timestamp BETWEEN %s AND %s
            ORDER BY device_id, timestamp
            """ , (device_id, start_dt, end_dt))
            
            device_data_points = cur.fetchall()
            
            if not device_data_points:
                downtime_minutes = (end_dt - start_dt).total_seconds() / 60
                if downtime_minutes >= min_downtime_minutes:
                    downtime_records.append({
                        "device_id": device_id,
                        "product_id": product_id,
                        "shift_id": shift_id,
                        "start_time": start_dt,
                        "end_time": end_dt,
                        "minutes": downtime_minutes,
                        "reason": "No data in scheduled period"
                    })

            else:
                
                # Downtime detection
                current_downtime_start = None
                prev_timestamp = None
                prev_value = None

                for point in device_data_points:
                    timestamp = point['timestamp']
                    value = point['device_data']

                    # Detect missing data gaps
                    if prev_timestamp:
                        gap_minutes = (timestamp - prev_timestamp).total_seconds() / 60
                        if gap_minutes >= min_downtime_minutes:
                            downtime_records.append({
                                "device_id": device_id,
                                "product_id": product_id,
                                "shift_id": shift_id,
                                "start_time": prev_timestamp,
                                "end_time": timestamp,
                                "minutes": gap_minutes,
                                "reason": "Data gap"
                            })

                    # Detect zero-value downtime
                    if value == 0 and (prev_value is None or prev_value > 0):
                        current_downtime_start = timestamp
                    elif value > 0 and current_downtime_start is not None:
                        downtime_minutes = (timestamp - current_downtime_start).total_seconds() / 60
                        if downtime_minutes >= min_downtime_minutes:
                            downtime_records.append({
                                "device_id": device_id,
                                "product_id": product_id,
                                "shift_id": shift_id,
                                "start_time": current_downtime_start,
                                "end_time": timestamp,
                                "minutes": downtime_minutes,
                                "reason": "Zero output"
                            })
                        current_downtime_start = None

                    prev_timestamp = timestamp
                    prev_value = value

                # Handle downtime still ongoing at schedule end
                if current_downtime_start is not None:
                    downtime_minutes = (end_dt - current_downtime_start).total_seconds() / 60
                    if downtime_minutes >= min_downtime_minutes:
                        downtime_records.append({
                            "device_id": device_id,
                            "product_id": product_id,
                            "shift_id": shift_id,
                            "start_time": current_downtime_start,
                            "end_time": end_dt,
                            "minutes": downtime_minutes,
                            "reason": "Ongoing downtime"
                        })

            # Insert downtime into DB
            for rec in downtime_records:          
                # Check if record exists
                cur.execute("""
                SELECT * FROM production_downtime
                WHERE device_id = %s AND product_id = %s AND shift_id = %s
                AND start_datetime = %s AND end_datetime = %s
                """, (rec['device_id'], rec['product_id'], rec['shift_id'],rec['start_time'], rec['end_time']))
            
                if not cur.fetchone():
                    cur.execute("""
                        INSERT INTO production_downtime
                        (device_id, product_id, shift_id, start_datetime, end_datetime, comment)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (rec['device_id'], rec['product_id'], rec['shift_id'], rec['start_time'], rec['end_time'], rec['reason']))
                    conn.commit()    

        return True

    except mysql.connector.Error as e:
        logger.error(e)
        return False
    finally:
        if 'conn' in locals() and conn.is_connected():
            cur.close()
            conn.close()

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
            
            if not company or company['company_status'] != 'Active':
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
        logger.error(e)
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
        #ToDo: create an automated way to generate the MQTT listener scripts
        #issue: http://127.0.0.1:3000/Abdelazizelmounir/NexplantWebsite/issues/2#issue-11
        
        # Send welcome email
        send_welcome_email(email, company_id, password)

        return jsonify({
            "message": "Company created successfully",
            "company_id": company_id,
            "admin_email": email,
            "temp_password": password
        }), 201

    except Exception as e:
        logger.error(e)
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
        
        #ToDo: create a script that can create the MQTT user and send an email with the password, currently the script needs to run from inside the server itself using sudo command
        #issue: http://127.0.0.1:3000/Abdelazizelmounir/NexplantWebsite/issues/1#issue-10
        
        return jsonify({
            "message": "Device registered successfully",
            "device_id": device_id,
        }), 201

    except Exception as e:
        logger.error(e)
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
        cur.execute("UPDATE companies SET company_status='Disabled' WHERE company_id=%s", (company_id,))
        cur.execute("UPDATE users SET status='Offline' WHERE company_id=%s", (company_id,))
        conn.commit()

        return jsonify({"message": "Company deactivated successfully"}), 200

    except Exception as e:
        logger.error(e)
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
        logger.error(e)
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
            logger.error(e)
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
                VALUES (%s, %s, %s, %s, %s)
            """, (username, hashed_password, company_id, role, 'Offline'))
            conn.commit()
            
            # ToDo: Send an email with the password to the email
            
            return jsonify({"message": "User created successfully"}), 201
        except Exception as e:
            logger.error(e)
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
            logger.error(e)
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
            logger.error(e)
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
        logger.error(e)
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

# === PRODUCTION SCHEDULING ROUTES ===
@app.route('/api/shifts', methods=['GET', 'POST'])
@session_required
def handle_shifts():
    user = session['user']
    company_id = user['company_id']
    
    if user['role'] == 'global_admin':
        return jsonify({"error": "Global admin cannot access company data"}), 403
    
    if not company_id:
        return jsonify({"error": "Company ID is required"}), 400
    
    if request.method == 'GET':
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor(dictionary=True)
            
            cur.execute("SELECT * FROM shifts ORDER BY start_time")
            shifts = cur.fetchall()
            
            # Convert timedelta objects to strings for JSON serialization
            for shift in shifts:
                if 'start_time' in shift and shift['start_time']:
                    shift['start_time'] = str(shift['start_time'])
                if 'end_time' in shift and shift['end_time']:
                    shift['end_time'] = str(shift['end_time'])
            
            return jsonify(shifts), 200
        except Exception as e:
            logger.error(e)
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()
    
    elif request.method == 'POST':
        if user['role'] != 'company_admin':
            return jsonify({"error": "Only company admin can create shifts"}), 403
        
        data = request.json
        shift_name = data.get('shift_name')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if not all([shift_name, start_time, end_time]):
            return jsonify({"error": "Missing required fields"}), 400
        
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor(dictionary=True)
            
            # Check if shift name is unique
            cur.execute("SELECT id FROM shifts WHERE shift_name=%s", (shift_name,))
            if cur.fetchone():
                return jsonify({"error": "Shift name already exists"}), 409
            
            # Check for time overlaps
            cur.execute("""
                SELECT id FROM shifts 
                WHERE (%s BETWEEN start_time AND end_time) 
                   OR (%s BETWEEN start_time AND end_time)
                   OR (start_time BETWEEN %s AND %s)
            """, (start_time, end_time, start_time, end_time))
            
            if cur.fetchone():
                return jsonify({"error": "Shift times overlap with existing shift"}), 409
            
            # Insert new shift
            cur.execute("""
                INSERT INTO shifts (shift_name, start_time, end_time)
                VALUES (%s, %s, %s)
            """, (shift_name, start_time, end_time))
            conn.commit()
            
            return jsonify({"message": "Shift created successfully"}), 201
        except Exception as e:
            logger.error(e)
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()

@app.route('/api/products', methods=['GET', 'POST'])
@session_required
def handle_products():
    user = session['user']
    company_id = user['company_id']
    
    if user['role'] == 'global_admin':
        return jsonify({"error": "Global admin cannot access company data"}), 403
    
    if not company_id:
        return jsonify({"error": "Company ID is required"}), 400
    
    if request.method == 'GET':
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor(dictionary=True)
            
            cur.execute("SELECT * FROM products ORDER BY product_name")
            products = cur.fetchall()
            
            return jsonify(products), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()
    
    elif request.method == 'POST':
        if user['role'] != 'company_admin':
            return jsonify({"error": "Only company admin can create products"}), 403
        
        data = request.json
        product_name = data.get('product_name')
        product_description = data.get('product_description', '')
        rated_speed = data.get('rated_speed')
        
        if not all([product_name, rated_speed]):
            return jsonify({"error": "Missing required fields"}), 400
        
        if float(rated_speed) <= 0:
            return jsonify({"error": "Rated speed must be greater than 0"}), 400
        
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor(dictionary=True)
            
            # Check if product name is unique
            cur.execute("SELECT id FROM products WHERE product_name=%s", (product_name,))
            if cur.fetchone():
                return jsonify({"error": "Product name already exists"}), 409
            
            # Insert new product
            cur.execute("""
                INSERT INTO products (product_name, product_description, rated_speed)
                VALUES (%s, %s, %s)
            """, (product_name, product_description, rated_speed))
            conn.commit()
            
            return jsonify({"message": "Product created successfully"}), 201
        except Exception as e:
            logger.error(e)
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()

@app.route('/api/production-schedule', methods=['GET', 'POST'])
@session_required
def handle_production_schedule():
    user = session['user']
    company_id = user['company_id']
    
    if user['role'] == 'global_admin':
        return jsonify({"error": "Global admin cannot access company data"}), 403
    
    if not company_id:
        return jsonify({"error": "Company ID is required"}), 400
    
    if request.method == 'GET':
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor(dictionary=True)
            
            cur.execute("""
                SELECT ps.*, d.device_name, p.product_name, s.shift_name,
                       p.rated_speed as product_rated_speed,
                       CASE 
                           WHEN ps.start_datetime <= NOW() AND ps.end_datetime >= NOW() THEN 'current'
                           WHEN ps.start_datetime > NOW() AND NOT EXISTS (
                               SELECT 1 FROM production_schedule 
                               WHERE start_datetime > NOW() 
                               AND start_datetime < ps.start_datetime
                           ) THEN 'next'
                           ELSE 'normal'
                       END as status
                FROM production_schedule ps
                LEFT JOIN devices d ON ps.device_id = d.device_id
                LEFT JOIN products p ON ps.product_id = p.id
                LEFT JOIN shifts s ON ps.shift_id = s.id
                ORDER BY ps.start_datetime
            """)
            schedules = cur.fetchall()
            
            # Convert timedelta objects to strings for JSON serialization
            for schedule in schedules:
                if 'start_datetime' in schedule and schedule['start_datetime']:
                    schedule['start_datetime'] = str(schedule['start_datetime'])
                if 'end_datetime' in schedule and schedule['end_datetime']:
                    schedule['end_datetime'] = str(schedule['end_datetime'])
                if 'modification_date' in schedule and schedule['modification_date']:
                    schedule['modification_date'] = str(schedule['modification_date'])
            
            return jsonify(schedules), 200
        except Exception as e:
            logger.error(e)
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()
    
    elif request.method == 'POST':
        if user['role'] != 'company_admin':
            return jsonify({"error": "Only company admin can create production schedules"}), 403
        
        data = request.json
        schedule_name = data.get('schedule_name')
        device_id = data.get('device_id')
        product_id = data.get('product_id')
        shift_id = data.get('shift_id')
        scheduled_date = data.get('scheduled_date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        is_recurring = data.get('is_recurring', False)
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not all([schedule_name, device_id, product_id, shift_id, scheduled_date, start_time, end_time]):
            return jsonify({"error": "Missing required fields"}), 400
        
        try:
            conn = get_company_db(company_id)
            cur = conn.cursor(dictionary=True)
            
            # Validate shift times
            cur.execute("SELECT start_time, end_time FROM shifts WHERE id=%s", (shift_id,))
            shift = cur.fetchone()
            if not shift:
                return jsonify({"error": "Invalid shift"}), 400
            
            # Shift times from DB are timedelta → convert to time
            shift_start = timedelta_to_time(shift['start_time'])
            shift_end = timedelta_to_time(shift['end_time'])

            # Production times from frontend (strings like "09:00")
            prod_start = datetime.strptime(start_time, "%H:%M").time()
            prod_end = datetime.strptime(end_time, "%H:%M").time()
            
            # Check if production times are within shift times
            if not is_within_shift(shift_start, shift_end, prod_start, prod_end):
                return jsonify({"error": "Production times must be within shift times"}), 400
            
            # Get product rated speed
            cur.execute("SELECT rated_speed FROM products WHERE id=%s", (product_id,))
            product = cur.fetchone()
            if not product:
                return jsonify({"error": "Invalid product"}), 400
            
            # Create the time the table modified
            modification_date = datetime.now()
            
            if is_recurring and start_date and end_date:
                # Create recurring schedules              
                schedule_id = 1
                cur.execute("SELECT COALESCE(MAX(schedule_id), 0) + 1 as next_id FROM production_schedule")
                next_id = cur.fetchone()['next_id']
                
                # Create datetime objects for production schedule
                prod_start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                prod_end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                prod_start_dt = datetime.combine(prod_start_date, prod_start)
                                
                while prod_start_date <= prod_end_date:   

                    # Handle overnight schedules
                    if prod_end < prod_start:
                        prod_end_dt = datetime.combine(prod_start_date + timedelta(days=1), prod_end)
                    else:
                        prod_end_dt = datetime.combine(prod_start_date, prod_end)
                    
                    cur.execute("""
                        INSERT INTO production_schedule 
                        (schedule_id, schedule_name, device_id, product_id, rated_speed, shift_id, 
                         modification_date, start_datetime, end_datetime)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (next_id, schedule_name, device_id, product_id, product['rated_speed'], 
                          shift_id, modification_date, prod_start_dt, prod_end_dt))
                    
                    prod_start_date += timedelta(days=1)                 
                    prod_start_dt += timedelta(days=1)
                    next_id += 1
            else:
                # Create single schedule
                cur.execute("SELECT COALESCE(MAX(schedule_id), 0) + 1 as next_id FROM production_schedule")
                next_id = cur.fetchone()['next_id']
                
                 # Create datetime objects for production schedule
                prod_start_date = datetime.strptime(scheduled_date, '%Y-%m-%d').date()
                prod_start_dt = datetime.combine(prod_start_date, prod_start)
                
                # Handle overnight schedules
                if prod_end < prod_start:
                    prod_end_dt = datetime.combine(prod_start_date + timedelta(days=1), prod_end)
                else:
                    prod_end_dt = datetime.combine(prod_start_date, prod_end)
                
                cur.execute("""
                    INSERT INTO production_schedule 
                    (schedule_id, device_id, product_id, rated_speed, shift_id, 
                     modification_date, start_datetime, end_datetime)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (next_id, device_id, product_id, product['rated_speed'], 
                      shift_id, modification_date, prod_start_dt, prod_end_dt))
            
            conn.commit()
            return jsonify({"message": "Production schedule created successfully"}), 201
        except Exception as e:
            logger.error(e)
            conn.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            if 'conn' in locals():
                conn.close()

# Production Dashboard Routes
@app.route('/api/production-dashboard/oee', methods=['GET'])
@session_required
def get_oee_data():
    user = session['user']
    company_id = request.args.get('company_id')
    
    if user['role'] not in ['company_admin', 'view_only_user']:
        return jsonify({"error": "Insufficient permissions"}), 403
    
    if user['role'] == 'company_admin' and str(user['company_id']) != company_id:
        return jsonify({"error": "Access denied"}), 403
    
    if user['role'] == 'view_only_user' and str(user['company_id']) != company_id:
        return jsonify({"error": "Access denied"}), 403
    
    try:
        conn = get_company_db(company_id)
        cur = conn.cursor(dictionary=True)
        
        # Get current time and date
        now = datetime.now()
        
        # Get all active schedules
        cur.execute("""
            SELECT ps.*, d.device_name, p.product_name, s.shift_name , p.rated_speed
            FROM production_schedule ps
            JOIN devices d ON ps.device_id = d.device_id
            JOIN products p ON ps.product_id = p.id
            JOIN shifts s ON ps.shift_id = s.id
            WHERE ps.start_datetime <= NOW() AND ps.end_datetime >= NOW()
            ORDER BY ps.device_id, ps.start_datetime
        """)
        schedules = cur.fetchall()
        
        oee_data = []
        
        for entry in schedules:
            product_rated_speed = entry['rated_speed']
            start_dt = entry['start_datetime']
            device_id = entry['device_id']
            device_name = entry['device_name']
            product_id = entry['product_id']
            product_name = entry['product_name']
            shift_id = entry['shift_id']
            shift_name = entry['shift_name']
            schedule_name =  entry['schedule_name']
            
            # calculating the total planned time
            total_planned_time_minutes = (now- start_dt).total_seconds() / 60
            total_planned_time_minutes = round(total_planned_time_minutes,0) # Round to full min


            # calculating the ideal count
            ideal_sum = total_planned_time_minutes * float(product_rated_speed)
            
            # calculating the available time and total data
            # Get data for this schedule time range                 
            cur.execute("""
            SELECT SUM(device_data) AS total_sum,  COUNT(*) AS total_count_above_zero
            FROM data
            WHERE device_id = (%s) AND device_data > 0 AND timestamp BETWEEN %s AND %s
            """ , (device_id, start_dt, now))
            data_entries = cur.fetchall()
            
            if not data_entries or data_entries[0]['total_sum'] is None or data_entries[0]['total_count_above_zero'] is None:
                total_sum = 0  # No data at all, zero total sum
                available_time_minutes = 0  # No data at all, zero available_time
            else:
                total_sum = float(data_entries[0]['total_sum']);
                available_time_minutes = float(data_entries[0]['total_count_above_zero']);
            
            availability = (available_time_minutes / total_planned_time_minutes) 
            performance = (total_sum / ideal_sum)
       
            oee_percentage = 100 * (performance * availability)
            
            oee_data.append({
                'schedule_name': schedule_name,
                'device_name': device_name,
                'product_name': product_name, 
                'oee_percentage': (round(oee_percentage, 4)),
                'performance': 100 * (round(performance, 4)), # in %
                'availability': 100 * (round(availability, 4)), # in %
                'total_count': total_sum,
                'rated_count': ideal_sum,
                'shift_name': shift_name
            })
            
        return jsonify(oee_data), 200
        
    except Exception as e:
        logger.error(f"Error getting OEE data: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/production-dashboard/timeseries', methods=['GET'])
@session_required
def get_timeseries_data():
    user = session['user']
    company_id = request.args.get('company_id')
    days = int(request.args.get('days', 1))
    
    # Limit to maximum 7 days
    days = min(days, 7)
    
    if user['role'] not in ['company_admin', 'view_only_user']:
        return jsonify({"error": "Insufficient permissions"}), 403
    
    if user['role'] == 'company_admin' and str(user['company_id']) != company_id:
        return jsonify({"error": "Access denied"}), 403
    
    if user['role'] == 'view_only_user' and str(user['company_id']) != company_id:
        return jsonify({"error": "Access denied"}), 403
    
    try:
        conn = get_company_db(company_id)
        cur = conn.cursor(dictionary=True)
        
       
        # Calculate date range
        now = datetime.now()
        start_time = now - timedelta(2) # 2 days back
        
        # Get devices for this company
        cur.execute("SELECT device_id, device_name FROM devices")
        devices = cur.fetchall()
        
        timeseries_data = []
        
        for entry in devices:
            # Get recent device data
            cur.execute("""
                SELECT * FROM data
                WHERE device_id = (%s) AND timestamp BETWEEN %s AND %s
                ORDER BY timestamp DESC
                LIMIT 1000
            """, (entry['device_id'], start_time, now))
            
            device_data = cur.fetchall()
            
            for row in device_data:
                timeseries_data.append({
                    'timestamp': row['timestamp'].isoformat(),
                    'device_data': row['device_data'],
                    'device_name':entry['device_name']
                })
            
        return timeseries_data
        
    except Exception as e:
        #return jsonify({"error": str(e)}), 500
        print("Error",e)
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/production-dashboard/downtime', methods=['GET'])
@session_required
def get_downtime_data():
    user = session['user']
    company_id = request.args.get('company_id')
    threshold = float(request.args.get('threshold', 50))  # Percentage of rated speed
    
    if user['role'] not in ['company_admin', 'view_only_user']:
        return jsonify({"error": "Insufficient permissions"}), 403
    
    if user['role'] == 'company_admin' and str(user['company_id']) != company_id:
        return jsonify({"error": "Access denied"}), 403
    
    if user['role'] == 'view_only_user' and str(user['company_id']) != company_id:
        return jsonify({"error": "Access denied"}), 403
    
    calculate_downtime(company_id)
    
    # Now as the downtime data is calculated and stored in MYSQL, it's time ro read it.
    try:
        conn = get_company_db(company_id)
        cur = conn.cursor(dictionary=True)
        
        # Get data      
        cur.execute("""
            SELECT pd.*, d.device_name, p.product_name, s.shift_name
            FROM production_downtime pd
            JOIN devices d ON pd.device_id = d.device_id
            JOIN products p ON pd.product_id = p.id
            JOIN shifts s ON pd.shift_id = s.id
            ORDER BY pd.device_id, pd.start_datetime
        """)
        downtime = cur.fetchall()
        
        downtime_data = []
        
        for entry in downtime:

            duration = (entry['end_datetime'] - entry['start_datetime']).total_seconds() / 60  # minutes
            # Get the data that interest us only
            downtime_data.append({
                'shift_name': entry['shift_name'],
                'product_name': entry['product_name'],
                'device_name': entry['device_name'],
                'start_time': entry['start_datetime'],
                'end_time':  entry['end_datetime'],
                'duration_minutes': int(duration),
                'details': entry['comment']
            })
                        
        # Sort by start time
        downtime_data.sort(key=lambda x: x['start_time'], reverse=True)
                                
        return jsonify(downtime_data), 200
        
    except Exception as e:
        logger.error(f"Error getting downtime data: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)