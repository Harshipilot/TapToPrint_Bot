from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

from Assets.database import get_dashboard_snapshot, get_db_connection, get_job_file_path, init_db

app = Flask(__name__)
CORS(app)

DB_NAME = "printx.db"

# Initialize the database schema and WAL mode
init_db()


def _validate_date(value, expected_format):
    """Return a validated date string or None."""
    if not value:
        return None
    try:
        datetime.strptime(value, expected_format)
        return value
    except ValueError:
        return None


def get_table_data(table_name, selected_date=None):
    """Fetch data from a table with optional date filtering for dashboard reads."""
    conn = get_db_connection(read_only=True)
    cursor = conn.cursor()

    if selected_date:
        selected_date = _validate_date(selected_date, "%Y-%m-%d")

    if selected_date and table_name == 'print_jobs':
        cursor.execute(
            "SELECT * FROM print_jobs WHERE date(requested_at) = ? ORDER BY requested_at DESC",
            (selected_date,)
        )
    else:
        cursor.execute(f"SELECT * FROM {table_name}")

    rows = cursor.fetchall()
    column_names = [description[0] for description in cursor.description]
    conn.close()

    return [dict(zip(column_names, row)) for row in rows]


def get_payment_records(month=None, selected_date=None, start_date=None, end_date=None, status=None):
    """Fetch payment records for a selected period with date-range filtering."""
    conn = get_db_connection(read_only=True)
    cursor = conn.cursor()

    clauses = []
    params = []

    normalized_month = month.strip() if month else None
    normalized_date = _validate_date(selected_date, "%Y-%m-%d") if selected_date else None
    normalized_start = _validate_date(start_date, "%Y-%m-%d") if start_date else None
    normalized_end = _validate_date(end_date, "%Y-%m-%d") if end_date else None

    if normalized_date:
        clauses.append("date(p.paid_at) = ?")
        params.append(normalized_date)
    elif normalized_month:
        clauses.append("strftime('%Y-%m', p.paid_at) = ?")
        params.append(normalized_month)
    elif normalized_start and normalized_end:
        clauses.append("date(p.paid_at) BETWEEN ? AND ?")
        params.extend([normalized_start, normalized_end])

    if status:
        status_value = status.strip().upper()
        if status_value and status_value != 'ALL':
            clauses.append("UPPER(COALESCE(p.payment_status, '')) = ?")
            params.append(status_value)

    query = """
        SELECT
            p.payment_id,
            p.job_id,
            p.user_id,
            p.amount,
            p.payment_status,
            p.paid_at,
            p.transaction_ref,
            pj.user_name,
            pj.file_name,
            pj.status AS job_status
        FROM payments p
        LEFT JOIN print_jobs pj ON pj.job_id = p.job_id
    """

    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    query += " ORDER BY p.paid_at DESC"
    rows = cursor.execute(query, params).fetchall()
    keys = [
        'payment_id', 'job_id', 'user_id', 'amount', 'payment_status', 'paid_at',
        'transaction_ref', 'user_name', 'file_name', 'job_status'
    ]
    conn.close()
    return [dict(zip(keys, row)) for row in rows]


@app.route('/api/print_jobs')
def get_print_jobs():
    return jsonify(get_table_data('print_jobs', request.args.get('date')))


@app.route('/api/print_jobs/<job_id>')
def get_print_job(job_id):
    conn = get_db_connection(read_only=True)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM print_jobs WHERE job_id = ? ORDER BY requested_at DESC LIMIT 1",
        (job_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Print job not found"}), 404

    keys = [
        'job_id', 'telegram_user_id', 'user_name', 'file_name', 'file_path', 'pages',
        'copies', 'printer_id', 'amount', 'status', 'requested_at'
    ]
    return jsonify(dict(zip(keys, row)))


@app.route('/api/payments')
def get_payments():
    month = request.args.get('month')
    selected_date = request.args.get('date')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    status = request.args.get('status')

    if month and _validate_date(f"{month}-01", "%Y-%m-%d") is None:
        return jsonify({"error": "Invalid month format. Use YYYY-MM."}), 400

    if selected_date and _validate_date(selected_date, "%Y-%m-%d") is None:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    if (start_date and _validate_date(start_date, "%Y-%m-%d") is None) or (end_date and _validate_date(end_date, "%Y-%m-%d") is None):
        return jsonify({"error": "Invalid date range. Use YYYY-MM-DD."}), 400

    return jsonify(get_payment_records(month=month, selected_date=selected_date, start_date=start_date, end_date=end_date, status=status))


@app.route('/api/printers')
def get_printers():
    return jsonify(get_table_data('printers'))


@app.route('/api/dashboard')
def get_dashboard():
    selected_date = request.args.get('date') or datetime.now().strftime('%Y-%m-%d')
    if _validate_date(selected_date, '%Y-%m-%d') is None:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    snapshot = get_dashboard_snapshot(selected_date)
    return jsonify(snapshot)


@app.route('/api/download/<job_id>')
def download_file(job_id):
    file_path = get_job_file_path(job_id)
    if file_path and os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=f"{job_id}.pdf")
    return jsonify({"error": "File not found"}), 404


@app.route('/api/stats')
def get_stats():
    """Get summary stats for the selected day without reading the whole database."""
    selected_date = request.args.get('date') or datetime.now().strftime('%Y-%m-%d')
    if _validate_date(selected_date, '%Y-%m-%d') is None:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    snapshot = get_dashboard_snapshot(selected_date)
    return jsonify({
        'date': snapshot['date'],
        'total_jobs': snapshot['total_jobs'],
        'total_revenue': snapshot['total_revenue'],
        'pending_jobs': snapshot['pending_jobs'],
        'completed_jobs': snapshot['completed_jobs'],
        'print_activity': snapshot['print_activity'],
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)