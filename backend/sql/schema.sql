CREATE TABLE IF NOT EXISTS UserCredentials (
  id CHAR(32) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_salt CHAR(32) NOT NULL,
  password_hash CHAR(128) NOT NULL,
  role ENUM('User', 'Administrator') NOT NULL DEFAULT 'User',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usercredentials_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS UserProfile (
  user_id CHAR(32) NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_userprofile_credentials
    FOREIGN KEY (user_id) REFERENCES UserCredentials (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Person 2: services offered by the organization
CREATE TABLE IF NOT EXISTS Service (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_name (name),
  CONSTRAINT chk_service_duration CHECK (duration_minutes BETWEEN 1 AND 480),
  CONSTRAINT chk_service_name_length CHECK (CHAR_LENGTH(name) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Person 2: one row each time a service's queue is opened.
-- A service can have many past (closed) queues but only one open queue,
-- which the generated column and unique key enforce. MySQL does not allow
-- ON DELETE CASCADE here because service_id feeds a stored generated column.
CREATE TABLE IF NOT EXISTS Queue (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id INT UNSIGNED NOT NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL DEFAULT NULL,
  open_service_id INT UNSIGNED
    AS (CASE WHEN status = 'open' THEN service_id ELSE NULL END) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_queue_one_open_per_service (open_service_id),
  KEY idx_queue_service (service_id),
  CONSTRAINT fk_queue_service
    FOREIGN KEY (service_id) REFERENCES Service (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Starting services, matching the A3 mock data
INSERT IGNORE INTO Service (id, name, description, duration_minutes, priority) VALUES
  (1, 'Academic Advising', 'Meet with an advisor', 15, 'Medium'),
  (2, 'Financial Aid', 'Help with aid and billing', 20, 'High'),
  (3, 'IT Help Desk', 'Tech and account support', 10, 'Low');

-- Only open a starting queue if the service has never had one, so loading
-- this file again never reopens a queue an admin closed
INSERT INTO Queue (service_id, status)
SELECT s.id, 'open' FROM Service s
WHERE s.id IN (1, 2)
  AND NOT EXISTS (SELECT 1 FROM Queue q WHERE q.service_id = s.id);
