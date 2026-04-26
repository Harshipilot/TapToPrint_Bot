from flask import Flask, jsonify, send_file
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for React app

DB_NAME = "printx.db"

def get_table_data(table_name):
    """Fetch all data from a table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    column_names = [description[0] for description in cursor.description]
    conn.close()
    
    # Convert to list of dicts
    data = [dict(zip(column_names, row)) for row in rows]
    return data

@app.route('/api/print_jobs')
def get_print_jobs():
    return jsonify(get_table_data('print_jobs'))

@app.route('/api/payments')
def get_payments():
    return jsonify(get_table_data('payments'))

@app.route('/api/printers')
def get_printers():
    return jsonify(get_table_data('printers'))

@app.route('/api/download/<job_id>')
def download_file(job_id):
    from Assets.database import get_job_file_path
    file_path = get_job_file_path(job_id)
    if file_path and os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=f"{job_id}.pdf")
    return jsonify({"error": "File not found"}), 404

@app.route('/api/stats')
def get_stats():
    """Get some basic stats for dashboard."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Total jobs
    cursor.execute("SELECT COUNT(*) FROM print_jobs")
    total_jobs = cursor.fetchone()[0]
    
    # Total revenue
    cursor.execute("SELECT SUM(amount) FROM payments WHERE payment_status = 'SUCCESS'")
    total_revenue = cursor.fetchone()[0] or 0
    
    # Pending jobs
    cursor.execute("SELECT COUNT(*) FROM print_jobs WHERE status = 'PENDING'")
    pending_jobs = cursor.fetchone()[0]
    
    # Completed jobs
    cursor.execute("SELECT COUNT(*) FROM print_jobs WHERE status = 'COMPLETED'")
    completed_jobs = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'total_jobs': total_jobs,
        'total_revenue': total_revenue,
        'pending_jobs': pending_jobs,
        'completed_jobs': completed_jobs
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)