# RepairHub

A full-stack repair service management platform built with **React**, **Spring Boot**, and **PostgreSQL**.

RepairHub connects customers who need repairs with verified technicians. Admins oversee the platform — approving technicians, assigning jobs, monitoring performance, and managing disputes.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Recharts, Lucide    |
| Backend   | Spring Boot 3, JDBC (JdbcTemplate)  |
| Database  | PostgreSQL                          |

---

## Features

### Customer
- Register and log in
- Submit repair requests with structured address, category, preferred date and estimated cost
- Track request status with a live progress timeline (Pending → Assigned → In Progress → Completed)
- Cancel a request while it is still pending
- Rate and review a technician after job completion

### Technician
- Apply to join the platform (requires admin approval before login)
- View assigned jobs with customer contact details and location
- Start and complete jobs, entering a final amount and notes
- View all personal reviews and ratings on a dedicated tab
- Submit a suspension appeal if account is suspended

### Admin
- Overview dashboard with platform stats and charts
  - Bar chart: requests by category
  - Line chart: requests over the last 6 months
- Approve or reject technician applications
- Review and resolve suspension appeals (approval reactivates the account)
- Assign technicians to pending requests
- Filter requests by status, category, and date range
- Suspend or reactivate any user
- View all platform reviews

---

## Project Structure

```
repairhub/
├── schema.sql
├── backend/
│   ├── AuthController.java
│   ├── CustomerController.java
│   ├── TechnicianController.java
│   └── AdminController.java
├── frontend/
│   ├── App.jsx
│   ├── LandingPage.jsx
│   ├── LoginForm.jsx
│   ├── CustomerDashboard.jsx
│   ├── TechnicianDashboard.jsx
│   └── AdminDashboard.jsx
└── README.md
```

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- PostgreSQL 14+

---

### 1. Database Setup

Create a PostgreSQL database and run the schema:

```sql
CREATE DATABASE repairhub;
```

Then in pgAdmin or psql, connect to the `repairhub` database and run the schema.sql file in pgAdmin:

psql -U postgres -d repairhub -f schema.sql

The schema creates all tables and seeds a default admin account:

| Email                  | Password   |
|------------------------|------------|
| admin@repairhub.com    | admin123   |

> Change the admin password after first login by running the update query in pgAdmin.

---

### 2. Backend Setup

Navigate to your Spring Boot project and update `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/repairhub
spring.datasource.username=your_postgres_username
spring.datasource.password=your_postgres_password
spring.datasource.driver-class-name=org.postgresql.Driver
```
Run the backend in the terminal/commandline by using this line:

./mvnw spring-boot:run

The API will be available at `http://localhost:8080`.

---

### 3. Frontend Setup

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## API Reference

### Auth
| Method | Endpoint             | Description                  |
|--------|----------------------|------------------------------|
| POST   | /api/auth/register   | Register customer/technician |
| POST   | /api/auth/login      | Login                        |

### Customer
| Method | Endpoint                                          | Description          |
|--------|---------------------------------------------------|----------------------|
| GET    | /api/customer/{id}/requests                       | Get all requests     |
| POST   | /api/customer/{id}/requests                       | Create request       |
| PATCH  | /api/customer/{id}/requests/{requestId}/cancel    | Cancel request       |
| POST   | /api/customer/{id}/reviews                        | Submit review        |

### Technician
| Method | Endpoint                                          | Description          |
|--------|---------------------------------------------------|----------------------|
| GET    | /api/technician/{id}/jobs                         | Get assigned jobs    |
| POST   | /api/technician/{id}/start/{assignmentId}         | Start a job          |
| POST   | /api/technician/{id}/complete/{assignmentId}      | Complete a job       |
| GET    | /api/technician/{id}/reviews                      | Get reviews          |
| POST   | /api/technician/{id}/appeal                       | Submit appeal        |

### Admin
| Method | Endpoint                                          | Description          |
|--------|---------------------------------------------------|----------------------|
| GET    | /api/admin/stats                                  | Platform stats       |
| GET    | /api/admin/stats/requests-by-category             | Chart data           |
| GET    | /api/admin/stats/requests-by-month                | Chart data           |
| GET    | /api/admin/users                                  | List users           |
| PATCH  | /api/admin/users/{id}/status                      | Update user status   |
| GET    | /api/admin/requests                               | List all requests    |
| POST   | /api/admin/requests/{id}/assign                   | Assign technician    |
| GET    | /api/admin/reviews                                | List all reviews     |
| GET    | /api/admin/appeals                                | List all appeals     |
| PATCH  | /api/admin/appeals/{id}                           | Resolve appeal       |

---

## Database Schema

```
users                — all accounts (customers, technicians, admins)
technician_profiles  — rating, jobs completed, bio, specialization
repair_requests      — service requests with address and status
technician_assignments — job assignments with start/complete timestamps
reviews              — customer ratings and comments
appeals              — suspension appeals from technicians
```

---

## Notes

- Technicians are set to `pending` status on registration and cannot log in until an admin approves them
- Suspended technicians can log in to submit an appeal — they see a restricted screen instead of the normal dashboard
- Request cancellation is only allowed while the request is still `pending` (not yet assigned)
- The backend uses raw `JdbcTemplate` — no JPA, no repositories, no service layer
- CORS is configured for `http://localhost:5173` (Vite default)
