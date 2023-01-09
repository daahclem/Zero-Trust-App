CREATE DATABASE IF NOT EXISTS bank;
use bank;
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY 'cats';
GRANT ALL ON bank.* TO 'root'@'localhost';
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    first_name    VARCHAR(32)    NOT NULL,
    last_name   VARCHAR(32)    NOT NULL,
    address   VARCHAR(128)    NOT NULL,
    pwd_hash     CHAR(60)    NOT NULL,
    CONSTRAINT uni_user UNIQUE (first_name, last_name)
);
CREATE INDEX user_name_idx ON users (first_name, last_name);
CREATE TABLE IF NOT EXISTS accounts (
    acc_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    balance FLOAT(2),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE INDEX acc_user_idx ON accounts (user_id);
