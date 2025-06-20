
-- Master Database Schema for NexPlant
-- Run this to create the master database and tables

CREATE DATABASE IF NOT EXISTS nexplant_master;
USE nexplant_master;

-- Companies table
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    company_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    description TEXT,
    status ENUM('Active', 'Deleted') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Global admin table
CREATE TABLE global_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_id VARCHAR(50) NOT NULL,
    role ENUM('company_admin', 'user') NOT NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_company (username, company_id)
);

-- Insert default global admin (change password in production)
INSERT INTO global_admin (username, password, status) 
VALUES ('admin', 'scrypt:32768:8:1$YourHashedPasswordHere', 'Active');

-- Note: Replace 'scrypt:32768:8:1$YourHashedPasswordHere' with actual hashed password
-- You can generate it using: 
-- from werkzeug.security import generate_password_hash
-- print(generate_password_hash('your_password'))
