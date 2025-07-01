
# NexPlant IoT Platform - Requirements Document

## 1. Project Overview

**Project Name:** NexPlant IoT Platform  
**Version:** 1.0  
**Date:** 2025-07-01  
**Document Type:** Software Requirements Specification (SRS)

### 1.1 Purpose
NexPlant is a comprehensive IoT platform designed for smart manufacturing and industrial operations. It provides real-time monitoring, device management, data analytics, and multi-tenant company management capabilities.

### 1.2 Scope
The platform serves as a centralized hub for managing IoT devices across multiple companies, providing role-based access control, device registration, data visualization, and administrative functions.

## 2. System Architecture

### 2.1 Frontend Technology Stack
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS with shadcn/ui components
- **State Management:** TanStack React Query
- **Routing:** React Router DOM
- **UI Components:** Radix UI primitives via shadcn/ui

### 2.2 Backend Technology Stack
- **Framework:** Flask (Python)
- **Database:** MySQL
- **Authentication:** Session-based with password hashing
- **CORS:** Enabled for cross-origin requests
- **MQTT:** Integration for IoT device communication

### 2.3 Database Structure
- **Master Database:** `nexplant_master`
  - Companies management
  - Global admin accounts  
  - User accounts across companies
- **Company Databases:** Individual databases per company
  - Entities (locations/facilities)
  - Devices registration
  - IoT data storage

## 3. User Roles and Permissions

### 3.1 Global Admin
- **Capabilities:**
  - Create and manage companies
  - Register devices for any company
  - View all companies and users
  - Access system-wide analytics
  - Deactivate companies

### 3.2 Company Admin
- **Capabilities:**
  - Manage users within their company
  - Register devices for their company
  - View company-specific data and analytics
  - Manage entities/locations

### 3.3 View-Only User
- **Capabilities:**
  - View devices and data within their company
  - Access read-only dashboards
  - No administrative functions

## 4. Functional Requirements

### 4.1 Authentication System
- **REQ-AUTH-001:** Users must authenticate with username/password
- **REQ-AUTH-002:** Session-based authentication with 8-hour expiration
- **REQ-AUTH-003:** Password hashing using werkzeug security
- **REQ-AUTH-004:** Role-based access control enforcement
- **REQ-AUTH-005:** Automatic session validation on protected routes

### 4.2 Company Management
- **REQ-COMP-001:** Global admins can create new companies
- **REQ-COMP-002:** Each company gets unique ID format: {COUNTRY_CODE}_{5_DIGITS}
- **REQ-COMP-003:** Automatic database creation for new companies
- **REQ-COMP-004:** Company deactivation (soft delete) capability
- **REQ-COMP-005:** Welcome email generation for new company admins

### 4.3 User Management
- **REQ-USER-001:** Add users with email, full name, company, and role
- **REQ-USER-002:** Automatic password generation for new users
- **REQ-USER-003:** User listing with filtering by company
- **REQ-USER-004:** Role assignment (company_admin, view_only_user)
- **REQ-USER-005:** User status tracking (Active/Offline)

### 4.4 Device Management
- **REQ-DEV-001:** Device registration with name, ID, type, and description
- **REQ-DEV-002:** Company-specific device isolation
- **REQ-DEV-003:** Device status tracking (Online/Offline)
- **REQ-DEV-004:** Unique device ID enforcement per company
- **REQ-DEV-005:** Device listing and filtering capabilities

### 4.5 Entity Management
- **REQ-ENT-001:** Create entities (locations/facilities) per company
- **REQ-ENT-002:** Entity attributes: name, location, description  
- **REQ-ENT-003:** Associate devices with entities
- **REQ-ENT-004:** Entity listing and management

### 4.6 Data Management
- **REQ-DATA-001:** Store IoT data with timestamp, device ID, and JSON payload
- **REQ-DATA-002:** MQTT integration for real-time data ingestion
- **REQ-DATA-003:** Data retrieval with date range filtering
- **REQ-DATA-004:** Data visualization and analytics
- **REQ-DATA-005:** Binary payload parsing for MQTT messages

## 5. User Interface Requirements

### 5.1 Landing Page
- **REQ-UI-001:** Hero section with company branding
- **REQ-UI-002:** Navigation menu with responsive design
- **REQ-UI-003:** Feature showcase sections
- **REQ-UI-004:** Login button prominently displayed
- **REQ-UI-005:** Mobile-responsive navigation

### 5.2 Authentication Interface
- **REQ-UI-006:** Login form with username/password fields
- **REQ-UI-007:** Error handling and user feedback
- **REQ-UI-008:** Redirect to dashboard on successful login
- **REQ-UI-009:** Session persistence indication

### 5.3 Dashboard Interface
- **REQ-UI-010:** Role-based sidebar navigation
- **REQ-UI-011:** Tabbed interface for different functions
- **REQ-UI-012:** Data tables with sorting and filtering
- **REQ-UI-013:** Modal forms for data entry
- **REQ-UI-014:** Toast notifications for user feedback

### 5.4 Form Components
- **REQ-UI-015:** Company creation form with validation
- **REQ-UI-016:** User addition form with role selection
- **REQ-UI-017:** Device registration form with company selection
- **REQ-UI-018:** Entity creation form
- **REQ-UI-019:** Form validation and error handling

## 6. Technical Requirements

### 6.1 Performance
- **REQ-PERF-001:** Page load time under 3 seconds
- **REQ-PERF-002:** API response time under 1 second
- **REQ-PERF-003:** Support for concurrent users (scalable architecture)
- **REQ-PERF-004:** Efficient database queries with proper indexing

### 6.2 Security
- **REQ-SEC-001:** HTTPS enforcement in production
- **REQ-SEC-002:** Password hashing with salt
- **REQ-SEC-003:** SQL injection prevention
- **REQ-SEC-004:** CORS configuration for allowed origins
- **REQ-SEC-005:** Session security with proper expiration

### 6.3 Data Integrity
- **REQ-DATA-INT-001:** Foreign key constraints enforcement
- **REQ-DATA-INT-002:** Transaction rollback on errors
- **REQ-DATA-INT-003:** Data validation on both client and server
- **REQ-DATA-INT-004:** Unique constraint enforcement

## 7. Integration Requirements

### 7.1 MQTT Integration
- **REQ-MQTT-001:** MQTT broker connectivity (localhost:1883)
- **REQ-MQTT-002:** Company-specific topic subscription
- **REQ-MQTT-003:** Binary payload parsing and data extraction
- **REQ-MQTT-004:** Automatic device validation before data storage
- **REQ-MQTT-005:** Service management for MQTT listeners

### 7.2 Email Integration
- **REQ-EMAIL-001:** Welcome email capability for new companies
- **REQ-EMAIL-002:** Password reset functionality (placeholder)
- **REQ-EMAIL-003:** SMTP configuration support

## 8. Deployment Requirements

### 8.1 Environment Configuration
- **REQ-DEPLOY-001:** Environment-specific configuration files
- **REQ-DEPLOY-002:** Database connection parameters
- **REQ-DEPLOY-003:** CORS origin configuration
- **REQ-DEPLOY-004:** Secret key management

### 8.2 Service Management
- **REQ-DEPLOY-005:** Systemd service files for MQTT listeners
- **REQ-DEPLOY-006:** Automatic service startup and management
- **REQ-DEPLOY-007:** Logging configuration for debugging
- **REQ-DEPLOY-008:** Process monitoring and restart capabilities

## 9. Error Handling and Logging

### 9.1 Frontend Error Handling
- **REQ-ERR-001:** User-friendly error messages
- **REQ-ERR-002:** Toast notifications for success/error states
- **REQ-ERR-003:** Form validation feedback
- **REQ-ERR-004:** Loading states for async operations

### 9.2 Backend Error Handling
- **REQ-ERR-005:** Structured error responses
- **REQ-ERR-006:** Database transaction rollback on errors
- **REQ-ERR-007:** MQTT connection error handling
- **REQ-ERR-008:** Comprehensive logging for debugging

## 10. Future Enhancements

### 10.1 Planned Features
- **REQ-FUTURE-001:** Real-time analytics dashboards
- **REQ-FUTURE-002:** Advanced data visualization charts
- **REQ-FUTURE-003:** Predictive maintenance algorithms
- **REQ-FUTURE-004:** Mobile application support
- **REQ-FUTURE-005:** API documentation and external integrations

### 10.2 Scalability Considerations
- **REQ-SCALE-001:** Horizontal scaling support
- **REQ-SCALE-002:** Load balancing capabilities
- **REQ-SCALE-003:** Database sharding strategies
- **REQ-SCALE-004:** Caching layer implementation

## 11. Acceptance Criteria

### 11.1 Core Functionality
- All user roles can authenticate successfully
- Companies can be created and managed by global admins
- Devices can be registered and managed per company
- IoT data can be ingested and retrieved
- User interface is responsive and intuitive

### 11.2 Quality Assurance
- No critical security vulnerabilities
- All forms validate input correctly
- Error states are handled gracefully
- Performance meets specified requirements
- Cross-browser compatibility achieved

---

**Document Version:** 1.0  
**Last Updated:** July 1, 2025  
**Approved By:** [To be filled]  
**Next Review Date:** [To be scheduled]
