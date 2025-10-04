-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(100) NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  manager_is_first_approver TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','MANAGER','EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
  manager_id BIGINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_company_email (company_id, email),
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  employee_id BIGINT NOT NULL,
  rule_id BIGINT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency_code VARCHAR(10) NOT NULL,
  company_amount DECIMAL(12,2) NOT NULL,
  company_currency_code VARCHAR(10) NOT NULL,
  exchange_rate DECIMAL(16,8) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NULL,
  spend_date DATE NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  decided_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_expenses_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Receipts
CREATE TABLE IF NOT EXISTS expense_receipts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  expense_id BIGINT NOT NULL,
  image_base64 LONGTEXT NULL,
  ocr_text LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_receipt_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Approval Rules (config templates)
CREATE TABLE IF NOT EXISTS approval_rules (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  min_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- 0 = no upper bound
  percentage_threshold DECIMAL(5,2) NOT NULL DEFAULT 0, -- 0 disables
  specific_approver_user_id BIGINT NULL,
  hybrid_mode ENUM('NONE','OR','AND') NOT NULL DEFAULT 'NONE',
  manager_is_first_approver TINYINT(1) NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rule_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_rule_specific_user FOREIGN KEY (specific_approver_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rule Steps (sequence)
CREATE TABLE IF NOT EXISTS approval_steps (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  rule_id BIGINT NOT NULL,
  step_order INT NOT NULL,
  mode ENUM('ALL','PERCENTAGE') NOT NULL DEFAULT 'ALL',
  threshold DECIMAL(5,2) NULL, -- used when PERCENTAGE
  CONSTRAINT fk_step_rule FOREIGN KEY (rule_id) REFERENCES approval_rules(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_rule_step (rule_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Approvers per Step (one or many)
CREATE TABLE IF NOT EXISTS approval_step_approvers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  step_id BIGINT NOT NULL,
  approver_user_id BIGINT NOT NULL,
  CONSTRAINT fk_step_approver_step FOREIGN KEY (step_id) REFERENCES approval_steps(id) ON DELETE CASCADE,
  CONSTRAINT fk_step_approver_user FOREIGN KEY (approver_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_step_user (step_id, approver_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Runtime Steps per Expense (materialized at submission time)
CREATE TABLE IF NOT EXISTS approval_steps_runtime (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  expense_id BIGINT NOT NULL,
  step_order INT NOT NULL,
  mode ENUM('ALL','PERCENTAGE') NOT NULL DEFAULT 'ALL',
  threshold DECIMAL(5,2) NULL,
  CONSTRAINT fk_runtime_step_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_expense_step (expense_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Actual approvals per approver user
CREATE TABLE IF NOT EXISTS expense_approvals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  expense_id BIGINT NOT NULL,
  step_runtime_id BIGINT NOT NULL,
  approver_user_id BIGINT NOT NULL,
  status ENUM('BLOCKED','PENDING','APPROVED','REJECTED','SKIPPED') NOT NULL DEFAULT 'BLOCKED',
  comment TEXT NULL,
  decided_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ea_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_ea_step FOREIGN KEY (step_runtime_id) REFERENCES approval_steps_runtime(id) ON DELETE CASCADE,
  CONSTRAINT fk_ea_user FOREIGN KEY (approver_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_expense_approver_step (expense_id, step_runtime_id, approver_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
