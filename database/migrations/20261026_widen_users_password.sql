-- Required by Node registration, which stores bcrypt password hashes (60 chars).
ALTER TABLE users
  MODIFY COLUMN password VARCHAR(255) NULL DEFAULT NULL;
