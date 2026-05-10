-- ==========================================================
-- FINAL STRICT 3NF DATABASE SCRIPT
-- ==========================================================

DROP DATABASE IF EXISTS unifund_db;
CREATE DATABASE unifund_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unifund_db;

-- ==========================================
-- 1. LOOKUP TABLES
-- ==========================================

CREATE TABLE roles (
    role_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE user_statuses (
    status_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE campaign_categories (
    category_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE campaign_statuses (
    status_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE loan_statuses (
    status_id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE risk_tiers (
    tier_name VARCHAR(20) PRIMARY KEY,
    min_score INT UNSIGNED NOT NULL,
    max_score INT UNSIGNED NOT NULL
);

-- ==========================================
-- 2. TRIGGER: RISK TIER OVERLAP PROTECTION
-- ==========================================

DELIMITER //
CREATE TRIGGER trg_check_tier_overlap_insert
BEFORE INSERT ON risk_tiers
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM risk_tiers 
        WHERE NOT (NEW.max_score < min_score OR NEW.min_score > max_score)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Risk Tier ranges cannot overlap.';
    END IF;
END//
DELIMITER ;

-- ==========================================
-- 3. CORE ENTITIES
-- ==========================================

CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone_number VARCHAR(20),
    role_id TINYINT UNSIGNED NOT NULL,
    status_id TINYINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (status_id) REFERENCES user_statuses(status_id)
);

CREATE TABLE student_profiles (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    student_id_number VARCHAR(50) UNIQUE NOT NULL,
    university VARCHAR(200) NOT NULL,
    major VARCHAR(200) NOT NULL,
    current_cgpa DECIMAL(3,2) NOT NULL,
    credit_score INT UNSIGNED DEFAULT 500,
    -- wallet_balance removed (Strict 3NF)
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE donor_profiles (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    organization_name VARCHAR(200),
    -- phone_number removed (Strict 3NF)
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ==========================================
-- 4. CAMPAIGNS
-- ==========================================

CREATE TABLE campaigns (
    campaign_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    category_id TINYINT UNSIGNED NOT NULL,
    status_id TINYINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    goal_amount DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES campaign_categories(category_id),
    FOREIGN KEY (status_id) REFERENCES campaign_statuses(status_id)
);

-- ==========================================
-- 5. LOANS & INSTALLMENTS
-- ==========================================

CREATE TABLE loans (
    loan_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT UNSIGNED NOT NULL,
    status_id TINYINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    tenure_months TINYINT UNSIGNED NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(user_id),
    FOREIGN KEY (status_id) REFERENCES loan_statuses(status_id)
);

CREATE TABLE loan_installments (
    installment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    due_date DATE NOT NULL,
    installment_amount DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

-- ==========================================
-- 6. FINANCIAL LEDGER (Supertype/Subtype)
-- ==========================================

CREATE TABLE transactions (
    transaction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL, 
    amount DECIMAL(15,2) NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Subtype 1: Donations
CREATE TABLE txn_donations (
    transaction_id BIGINT UNSIGNED PRIMARY KEY,
    campaign_id BIGINT UNSIGNED NOT NULL,
    message TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id)
);

-- Subtype 2: Repayments
CREATE TABLE txn_repayments (
    transaction_id BIGINT UNSIGNED PRIMARY KEY,
    installment_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (installment_id) REFERENCES loan_installments(installment_id)
);

-- Subtype 3: Disbursements
CREATE TABLE txn_disbursements (
    transaction_id BIGINT UNSIGNED PRIMARY KEY,
    loan_id BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);

-- ==========================================
-- 7. TRIGGERS: DISJOINT SUBTYPES
-- ==========================================

DELIMITER //

-- Check Donation
CREATE TRIGGER trg_check_donation_disjoint BEFORE INSERT ON txn_donations FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM txn_repayments WHERE transaction_id = NEW.transaction_id) 
    OR EXISTS (SELECT 1 FROM txn_disbursements WHERE transaction_id = NEW.transaction_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Transaction already exists as another subtype.';
    END IF;
END//

-- Check Repayment
CREATE TRIGGER trg_check_repayment_disjoint BEFORE INSERT ON txn_repayments FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM txn_donations WHERE transaction_id = NEW.transaction_id)
    OR EXISTS (SELECT 1 FROM txn_disbursements WHERE transaction_id = NEW.transaction_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Transaction already exists as another subtype.';
    END IF;
END//

-- Check Disbursement
CREATE TRIGGER trg_check_disbursement_disjoint BEFORE INSERT ON txn_disbursements FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM txn_donations WHERE transaction_id = NEW.transaction_id)
    OR EXISTS (SELECT 1 FROM txn_repayments WHERE transaction_id = NEW.transaction_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error: Transaction already exists as another subtype.';
    END IF;
END//

DELIMITER ;

-- ==========================================
-- 8. ANCILLARY TABLES
-- ==========================================

CREATE TABLE fraud_alerts (
    alert_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE campaign_ratings (
    rating_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id BIGINT UNSIGNED NOT NULL,
    donor_id BIGINT UNSIGNED NOT NULL,
    rating_stars TINYINT UNSIGNED NOT NULL CHECK (rating_stars BETWEEN 1 AND 5),
    review_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unq_campaign_donor (campaign_id, donor_id)
);

-- ==========================================
-- 9. VIEWS (Strict 3NF Compliance)
-- ==========================================

-- View 1: Student Wallet (Corrected for Cash Flow Direction)
CREATE OR REPLACE VIEW vw_student_wallet AS
SELECT 
    t.user_id,
    COALESCE(SUM(
        CASE 
            -- Disbursements are MONEY IN (+) to the user's wallet
            WHEN d.transaction_id IS NOT NULL THEN t.amount 
            
            -- Repayments are MONEY OUT (-) from the user's wallet
            WHEN r.transaction_id IS NOT NULL THEN -t.amount 
            
            -- Donations are MONEY OUT (-) from the donor's wallet 
            WHEN don.transaction_id IS NOT NULL THEN -t.amount 
            
            ELSE 0 
        END
    ), 0) AS current_balance
FROM transactions t
LEFT JOIN txn_disbursements d ON t.transaction_id = d.transaction_id
LEFT JOIN txn_repayments r ON t.transaction_id = r.transaction_id
LEFT JOIN txn_donations don ON t.transaction_id = don.transaction_id
GROUP BY t.user_id;

-- View 2: Campaign Stats (Replaces derived columns)
CREATE OR REPLACE VIEW vw_campaign_stats_pure AS
SELECT 
    c.campaign_id,
    c.title,
    COALESCE(SUM(t.amount), 0) as raised_amount,
    COUNT(DISTINCT t.user_id) as donor_count
FROM campaigns c
LEFT JOIN txn_donations td ON c.campaign_id = td.campaign_id
LEFT JOIN transactions t ON td.transaction_id = t.transaction_id
GROUP BY c.campaign_id;

-- ==========================================
-- 10. SEED DATA
-- ==========================================

INSERT INTO roles (role_name) VALUES ('student'), ('donor'), ('admin');
INSERT INTO user_statuses (status_name) VALUES ('active'), ('inactive'), ('banned'), ('pending');
INSERT INTO campaign_categories (category_name) VALUES ('Education'), ('Medical'), ('Emergency'), ('Project');
INSERT INTO campaign_statuses (status_name) VALUES ('draft'), ('active'), ('completed'), ('rejected');
INSERT INTO loan_statuses (status_name) VALUES ('pending'), ('approved'), ('active'), ('defaulted'), ('paid');
INSERT INTO risk_tiers (tier_name, min_score, max_score) VALUES ('Very High', 300, 549), ('High', 550, 649), ('Medium', 650, 749), ('Low', 750, 850);

-- Insert Admin
INSERT INTO users (email, password_hash, full_name, role_id, status_id) 
VALUES ('admin@unifund.bd', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Admin', 3, 1);