import sqlite3
from datetime import datetime
import csv
import os

DB_NAME = "printx.db"
DB_TIMEOUT_SECONDS = 30

DEFAULT_PRINTERS = [
    {
        "printer_id": "Ujire_1",
        "printer_name": "Ujire 1",
        "status": "ONLINE",
        "latitude": 12.9883333333,
        "longitude": 75.3352222222,
        "subscribed": 1,
    },
    {
        "printer_id": "Ujire_2",
        "printer_name": "Ujire 2",
        "status": "ONLINE",
        "latitude": 12.9915277778,
        "longitude": 75.3309444444,
        "subscribed": 1,
    },
    {
        "printer_id": "Ujire_3",
        "printer_name": "Ujire 3",
        "status": "ONLINE",
        "latitude": 12.9934722222,
        "longitude": 75.3299722222,
        "subscribed": 1,
    },
    {
        "printer_id": "Arasinamakki_1",
        "printer_name": "Arasinamakki 1",
        "status": "ONLINE",
        "latitude": 12.9288333333,
        "longitude": 75.40675,
        "subscribed": 1,
    },
]


def get_db_connection(read_only=False):
    """Open a SQLite connection with a safe timeout and WAL settings for writes."""
    if read_only:
        db_uri = f"file:{os.path.abspath(DB_NAME)}?mode=ro"
        conn = sqlite3.connect(db_uri, uri=True, timeout=DB_TIMEOUT_SECONDS)
        conn.execute("PRAGMA busy_timeout = 30000")
        conn.execute("PRAGMA query_only = 1")
        return conn

    conn = sqlite3.connect(DB_NAME, timeout=DB_TIMEOUT_SECONDS)
    conn.execute(f"PRAGMA busy_timeout = {DB_TIMEOUT_SECONDS * 1000}")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


def init_db():
    """Initializes the database and creates required tables."""
    conn = get_db_connection(read_only=False)
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
    ensure_printer_schema()

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_print_jobs_requested_at ON print_jobs(requested_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_print_jobs_status_requested_at ON print_jobs(status, requested_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_print_jobs_date_status ON print_jobs(date(requested_at), status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_payments_payment_status_paid_at ON payments(payment_status, paid_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_printers_status ON printers(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_printers_subscribed ON printers(subscribed, status)")

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully.")


def ensure_printer_schema():
    """Add required columns and seed the printer registry for active subscribed printers."""
    conn = get_db_connection(read_only=False)
    cursor = conn.cursor()

    existing_columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(printers)").fetchall()
    }

    for column_name, column_sql in {
        'printer_name': 'TEXT',
        'latitude': 'REAL',
        'longitude': 'REAL',
        'subscribed': 'INTEGER DEFAULT 1',
    }.items():
        if column_name not in existing_columns:
            cursor.execute(f"ALTER TABLE printers ADD COLUMN {column_name} {column_sql}")

    inserted_printers = [row[0] for row in cursor.execute('SELECT printer_id FROM printers').fetchall()]
    for printer in DEFAULT_PRINTERS:
        if printer['printer_id'] not in inserted_printers:
            cursor.execute(
                '''
                INSERT INTO printers (printer_id, printer_name, status, latitude, longitude, subscribed, queue_length, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)
                ''', (
                    printer['printer_id'],
                    printer['printer_name'],
                    printer['status'],
                    printer['latitude'],
                    printer['longitude'],
                    printer['subscribed'],
                    datetime.now().isoformat(),
                )
            )

    conn.commit()
    conn.close()


# ================= HELPER FUNCTIONS =================


def log_print_job(data):
    """Saves a new print request from the Telegram bot."""
    conn = get_db_connection(read_only=False)
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
    conn = get_db_connection(read_only=False)
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
    conn = get_db_connection(read_only=False)
    cursor = conn.cursor()
    cursor.execute("UPDATE print_jobs SET status = ? WHERE job_id = ?", (status, job_id))
    conn.commit()
    conn.close()


def update_file_path(job_id, file_path):
    """Updates the file path for a print job."""
    conn = get_db_connection(read_only=False)
    cursor = conn.cursor()
    cursor.execute("UPDATE print_jobs SET file_path = ? WHERE job_id = ?", (file_path, job_id))
    conn.commit()
    conn.close()


def get_job_file_path(job_id):
    """Gets the file path for a print job."""
    conn = get_db_connection(read_only=True)
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM print_jobs WHERE job_id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None


def get_job_file(job_id, user_id):
    """Gets the file path for a print job if it belongs to the user."""
    conn = get_db_connection(read_only=True)
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM print_jobs WHERE job_id = ? AND telegram_user_id = ?", (job_id, user_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None


def update_printer_id(job_id, printer_id):
    """Updates the printer ID for a print job."""
    conn = get_db_connection(read_only=False)
    cursor = conn.cursor()
    cursor.execute("UPDATE print_jobs SET printer_id = ? WHERE job_id = ?", (printer_id, job_id))
    conn.commit()
    conn.close()


def get_dashboard_snapshot(selected_date=None):
    """Return a compact daily dashboard snapshot for the selected date."""
    if not selected_date:
        selected_date = datetime.now().strftime("%Y-%m-%d")

    try:
        datetime.strptime(selected_date, "%Y-%m-%d")
    except ValueError:
        selected_date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db_connection(read_only=True)
    cursor = conn.cursor()

    total_jobs = cursor.execute(
        "SELECT COUNT(*) FROM print_jobs WHERE date(requested_at) = ?",
        (selected_date,)
    ).fetchone()[0]

    total_revenue = cursor.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'SUCCESS' AND date(paid_at) = ?",
        (selected_date,)
    ).fetchone()[0] or 0

    pending_jobs = cursor.execute(
        "SELECT COUNT(*) FROM print_jobs WHERE status = 'PENDING' AND date(requested_at) = ?",
        (selected_date,)
    ).fetchone()[0]

    completed_jobs = cursor.execute(
        "SELECT COUNT(*) FROM print_jobs WHERE status = 'COMPLETED' AND date(requested_at) = ?",
        (selected_date,)
    ).fetchone()[0]

    activity_rows = []
    for label, status in [
        ("Pending", "PENDING"),
        ("Paid", "PAID"),
        ("Ready", "READY_TO_PRINT"),
        ("Completed", "COMPLETED"),
    ]:
        val = cursor.execute(
            "SELECT COUNT(*) FROM print_jobs WHERE status = ? AND date(requested_at) = ?",
            (status, selected_date)
        ).fetchone()[0]
        activity_rows.append({"time": label, "val": val})

    recent_jobs = cursor.execute(
        """
        SELECT job_id, telegram_user_id, user_name, file_name, printer_id, status, requested_at
        FROM print_jobs
        WHERE date(requested_at) = ?
        ORDER BY requested_at DESC
        LIMIT 6
        """,
        (selected_date,)
    ).fetchall()

    latest_printers = cursor.execute(
        "SELECT status, COUNT(*) AS count FROM printers GROUP BY status"
    ).fetchall()

    total_printers = sum(row[1] for row in latest_printers)
    online_printers = next((row[1] for row in latest_printers if row[0] == 'ONLINE'), 0)

    conn.close()

    return {
        "date": selected_date,
        "total_jobs": total_jobs,
        "total_revenue": float(total_revenue),
        "pending_jobs": pending_jobs,
        "completed_jobs": completed_jobs,
        "print_activity": activity_rows,
        "recent_jobs": [
            {
                "job_id": row[0],
                "telegram_user_id": row[1],
                "user_name": row[2],
                "file_name": row[3],
                "printer_id": row[4],
                "status": row[5],
                "requested_at": row[6],
            }
            for row in recent_jobs
        ],
        "online_printers": online_printers,
        "total_printers": total_printers,
    }


# ================= EXPORT FUNCTIONS =================

def export_table_to_csv(table_name, filename):
    """Exports a table to CSV file."""
    conn = get_db_connection(read_only=True)
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


def get_active_printers():
    """Return all subscribed printers currently available for job assignment."""
    conn = get_db_connection(read_only=True)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT printer_id, printer_name, status, latitude, longitude, subscribed
        FROM printers
        WHERE subscribed = 1 AND status IN ('ONLINE', 'BUSY')
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY printer_id ASC
        """
    )
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            'printer_id': row[0],
            'printer_name': row[1],
            'status': row[2],
            'latitude': float(row[3]) if row[3] is not None else None,
            'longitude': float(row[4]) if row[4] is not None else None,
            'subscribed': row[5],
        }
        for row in rows
    ]


if __name__ == "__main__":
    init_db()
    ensure_printer_schema()