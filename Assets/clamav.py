import subprocess
import time
import sqlite3
from datetime import datetime

# Path to your database
DB_NAME = "printx.db"

def get_clamav_version():
    try:
        result = subprocess.run(
            ["clamscan", "--version"],
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except:
        return "ClamAV"

def log_scan_to_db(job_id, is_safe, scan_stats):
    """
    Optional: If you want a separate table for security logs, 
    or you can just update the status in the print_jobs table.
    """
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # We update the status of the job based on the scan
    status = "SAFE" if is_safe else "REJECTED_THREAT"
    
    cursor.execute('''
        UPDATE print_jobs 
        SET status = ? 
        WHERE job_id = ?
    ''', (status, job_id))
    
    conn.commit()
    conn.close()

def scan_file(file_path, job_id=None):
    """
    Scan file using ClamAV and optionally log to DB
    """
    start_time = time.time()

    try:
        result = subprocess.run(
            ["clamscan", file_path],
            capture_output=True,
            text=True
        )

        scan_time = round(time.time() - start_time, 2)
        output = result.stdout
        is_safe = "Infected files: 0" in output
        
        stats = {
            "scan_time": scan_time,
            "engine": get_clamav_version()
        }

        # If a job_id is provided, log the result immediately
        if job_id:
            log_scan_to_db(job_id, is_safe, stats)

        return is_safe, stats

    except Exception as e:
        return False, {
            "scan_time": 0,
            "engine": "Error",
            "error": str(e)
        }