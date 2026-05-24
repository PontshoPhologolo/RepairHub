-- RepairHub Database Schema
-- Drop everything cleanly
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS technician_assignments CASCADE;
DROP TABLE IF EXISTS repair_requests CASCADE;
DROP TABLE IF EXISTS technician_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─────────────────────────────────────────
-- USERS
-- role:   'customer' | 'technician' | 'admin'
-- status: 'active' | 'pending' | 'suspended'
--   - technicians start as 'pending' until admin approves
--   - customers start as 'active' immediately
-- ─────────────────────────────────────────
CREATE TABLE users (
    user_id     BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('customer', 'technician', 'admin')),
    status      VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- TECHNICIAN PROFILES
-- Created when technician registers (pending approval)
-- ─────────────────────────────────────────
CREATE TABLE technician_profiles (
    technician_id   BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    bio             TEXT,
    specialization  VARCHAR(100),
    rating          NUMERIC(3,2) DEFAULT 0.00,
    jobs_completed  INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────
-- REPAIR REQUESTS
-- status: 'pending' | 'assigned' | 'in_progress' | 'completed'
-- Address stored as structured fields on the request itself
-- ─────────────────────────────────────────
CREATE TABLE repair_requests (
    request_id      BIGSERIAL PRIMARY KEY,
    customer_id     BIGINT NOT NULL REFERENCES users(user_id),
    category        VARCHAR(100) NOT NULL,
    description     TEXT NOT NULL,
    address_line1   VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    postal_code     VARCHAR(20)  NOT NULL,
    scheduled_date  DATE,
    estimated_cost  NUMERIC(10,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed')),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- TECHNICIAN ASSIGNMENTS
-- One active assignment per request at a time
-- started_at  set when technician clicks "Start Job"
-- completed_at set when technician clicks "Complete"
-- final_amount can differ from estimated_cost
-- ─────────────────────────────────────────
CREATE TABLE technician_assignments (
    assignment_id   BIGSERIAL PRIMARY KEY,
    request_id      BIGINT NOT NULL REFERENCES repair_requests(request_id) ON DELETE CASCADE,
    technician_id   BIGINT NOT NULL REFERENCES users(user_id),
    assigned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    final_amount    NUMERIC(10,2),
    notes           TEXT
);

-- ─────────────────────────────────────────
-- REVIEWS
-- Customer leaves a review after request is completed
-- One review per request
-- ─────────────────────────────────────────
CREATE TABLE reviews (
    review_id       BIGSERIAL PRIMARY KEY,
    request_id      BIGINT NOT NULL UNIQUE REFERENCES repair_requests(request_id) ON DELETE CASCADE,
    customer_id     BIGINT NOT NULL REFERENCES users(user_id),
    technician_id   BIGINT NOT NULL REFERENCES users(user_id),
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
-- SEED: Default admin account
-- Password: admin123 (you should change this)
-- This is a bcrypt hash of "admin123"
-- ─────────────────────────────────────────
INSERT INTO users (email, password_hash, full_name, role, status)
VALUES (
    'admin@repairhub.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y',
    'System Admin',
    'admin',
    'active'
);

-- ─────────────────────────────────────────
-- APPEALS
-- Created when a suspended technician submits an appeal
-- status: 'pending' | 'approved' | 'rejected'
-- ─────────────────────────────────────────
CREATE TABLE appeals (
    appeal_id   BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reason      TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
