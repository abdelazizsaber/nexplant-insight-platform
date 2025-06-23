import mysql.connector
from mysql.connector import errorcode
from werkzeug.security import generate_password_hash, check_password_hash
import getpass

# ======================
# CONFIGURATION VARIABLES
# ======================
# Database Configuration
DB_HOST = "localhost"
DB_NAME = "nexplant_master"
DB_CHARSET = "utf8mb4"
DB_COLLATION = "utf8mb4_unicode_ci"

ADMIN_EMAIL = "admin@nexplant.com"
ADMIN_PASSWORD = "SecurePassword123!"  # TBD: In production, don't store this in the script!

# MySQL Connection Configuration
MYSQL_USER = "root"  # Default MySQL user for setup
# MYSQL_PASSWORD will be prompted during execution

# ======================
# DATABASE SETUP FUNCTION
# ======================
def create_database_and_tables():
    # Get MySQL password securely
    print(f"Enter MySQL password for user '{MYSQL_USER}' to create database and tables:")
    mysql_password = getpass.getpass("MySQL password: ")
    
    try:
        # Connect to MySQL server (without specifying a database)
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=MYSQL_USER,
            password=mysql_password
        )
        cursor = conn.cursor()
        
        # Create database if not exists
        cursor.execute(f"""
            CREATE DATABASE IF NOT EXISTS {DB_NAME} 
            CHARACTER SET {DB_CHARSET} 
            COLLATE {DB_COLLATION}
        """)
        cursor.execute(f"USE {DB_NAME}")
        print(f"✅ Database '{DB_NAME}' is ready.")

        
        # Create companies table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                company_id VARCHAR(20) PRIMARY KEY,
                company_name VARCHAR(100) NOT NULL,
                company_desc VARCHAR(500),
                company_status ENUM('Active', 'Disabled') NOT NULL DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_company_status (company_status)
            ) ENGINE=InnoDB
        """)

        # Create global_admin table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS global_admin (
                admin_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL COMMENT 'Stores hashed password',
                last_login TIMESTAMP NULL DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_admin_email (username)
            ) ENGINE=InnoDB
        """)

        # Table: users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                password VARCHAR(255) NOT NULL COMMENT 'Stores hashed password',
                company_id VARCHAR(20) NOT NULL,
                role ENUM('global_admin', 'company_admin', 'view_only_user') NOT NULL DEFAULT 'view_only_user',
                status ENUM('Online', 'Offline') NOT NULL DEFAULT 'Offline',
                last_login TIMESTAMP NULL DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_user_email_company (username, company_id),
                INDEX idx_user_status (status),
                INDEX idx_user_company (company_id),
                INDEX idx_user_email (username),
                CONSTRAINT fk_user_company FOREIGN KEY (company_id) 
                    REFERENCES companies (company_id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        """)

        print("✅ Tables created successfully: companies, global_admin, users")

        # Create global admin user if not present
        cursor.execute("SELECT COUNT(*) FROM global_admin WHERE username = %s", (ADMIN_EMAIL,))
        if cursor.fetchone()[0] == 0:
            print("⚙️ Creating global admin user...")
            hashed_password = generate_password_hash(ADMIN_PASSWORD)
            cursor.execute(
                "INSERT INTO global_admin (username, password) VALUES (%s, %s)",
                (ADMIN_EMAIL, hashed_password)
            )
            print(f"✅ Admin user '{ADMIN_EMAIL}' created.")
        else:
            print(f"ℹ️ Admin user '{ADMIN_EMAIL}' already exists.")

        conn.commit()

    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("❌ Access denied. Check your MySQL username and password.")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("❌ Database does not exist.")
        else:
            print(f"❌ Error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
            print("✅ MySQL connection closed.")

if __name__ == "__main__":
    create_database_and_tables()