import sqlite3
from datetime import datetime
import csv
import os

DB_NAME = "printx.db"

def init_db():
    """Initializes the database and creates required tables."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    # 1. PRINT REQUESTS TABLE
    # Tracks the file details and user info
    cursor.execute('''CREATE TABLE IF NOT EXISTS print_jobs (
        job_id TEXT PRIMARY KEY,
        telegram_user_id INTEGER,
        user_name TEXT,
        file_name TEXT,
        file_path TEXT,
        pages INTEGER,
        copies INTEGER,
        printer_id TEXT,
        amount REAL,
        status TEXT, -- PENDING, PAID, PRINTING, COMPLETED
        requested_at TIMESTAMP
    )''')

    # 2. PAYMENTS TABLE
    # Tracks financial transactions
    cursor.execute('''CREATE TABLE IF NOT EXISTS payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT,
        user_id INTEGER,
        amount REAL,
        payment_status TEXT,
        paid_at TIMESTAMP,
        transaction_ref TEXT,
        FOREIGN KEY(job_id) REFERENCES print_jobs(job_id)
    )''')

    # 3. PRINTER HEARTBEAT TABLE
    # Tracks if your physical printer is online
    cursor.execute('''CREATE TABLE IF NOT EXISTS printers (
        printer_id TEXT PRIMARY KEY,
        status TEXT, -- ONLINE, OFFLINE, BUSY
        queue_length INTEGER,
        last_seen TIMESTAMP
    )''')

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully.")

# ================= HELPER FUNCTIONS =================

def log_print_job(data):
    """Saves a new print request from the Telegram bot."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO print_jobs 
        (job_id, telegram_user_id, user_name, file_name, file_path, pages, copies, printer_id, amount, status, requested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'], data['u_id'], data['u_name'], data['f_name'],
        data['f_path'], data['pages'], data['copies'], data['p_id'],
        data['amount'], 'PENDING', datetime.now()
    ))
    conn.commit()
    conn.close()

def record_payment(job_id, user_id, amount, txn_ref):
    """Updates job status and logs payment details."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Update Job Status
    cursor.execute("UPDATE print_jobs SET status = 'PAID' WHERE job_id = ?", (job_id,))
    
    # Insert Payment Record
    cursor.execute('''
        INSERT INTO payments (job_id, user_id, amount, payment_status, paid_at, transaction_ref)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (job_id, user_id, amount, 'SUCCESS', datetime.now(), txn_ref))
    
    conn.commit()
    conn.close()

def update_job_status(job_id, status):
    """Updates the status of a print job."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE print_jobs SET status = ? WHERE job_id = ?", (status, job_id))
    conn.commit()
    conn.close()

def update_file_path(job_id, file_path):
    """Updates the file path for a print job."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE print_jobs SET file_path = ? WHERE job_id = ?", (file_path, job_id))
    conn.commit()
    conn.close()

def get_job_file_path(job_id):
    """Gets the file path for a print job."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM print_jobs WHERE job_id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

def get_job_file(job_id, user_id):
    """Gets the file path for a print job if it belongs to the user."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM print_jobs WHERE job_id = ? AND telegram_user_id = ?", (job_id, user_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

def update_printer_id(job_id, printer_id):
    """Updates the printer ID for a print job."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE print_jobs SET printer_id = ? WHERE job_id = ?", (printer_id, job_id))
    conn.commit()
    conn.close()

# ================= EXPORT FUNCTIONS =================

def export_table_to_csv(table_name, filename):
    """Exports a table to CSV file."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    column_names = [description[0] for description in cursor.description]
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(column_names)
        writer.writerows(rows)
    
    conn.close()

def export_all_data(directory="exports"):
    """Exports all tables to CSV files in the specified directory."""
    os.makedirs(directory, exist_ok=True)
    export_table_to_csv('print_jobs', f'{directory}/print_jobs.csv')
    export_table_to_csv('payments', f'{directory}/payments.csv')
    export_table_to_csv('printers', f'{directory}/printers.csv')
    print(f"✅ Data exported to {directory}/")

if __name__ == "__main__":
    init_db()