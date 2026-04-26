import os
import razorpay
import sqlite3
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DB_NAME = "printx.db"

KEY_ID = os.getenv("RAZORPAY_KEY_ID")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

if not KEY_ID or not KEY_SECRET:
    raise ValueError("❌ Razorpay keys not found")

client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))

# ================= DATABASE LOGGING =================
def log_payment_attempt(job_id, user_id, amount, link):
    """
    Records that a payment link was generated for a specific job.
    Sets status to 'AWAITING_PAYMENT'.
    """
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Update the job status to show we are waiting for money
        cursor.execute(
            "UPDATE print_jobs SET status = 'AWAITING_PAYMENT' WHERE job_id = ?", 
            (job_id,)
        )
        
        # Log the attempt in the payments table with the link as reference
        cursor.execute('''
            INSERT INTO payments (job_id, user_id, amount, payment_status, paid_at, transaction_ref)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (job_id, user_id, amount, 'LINK_GENERATED', datetime.now(), f"LINK: {link}"))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"❌ DB Payment Log Error: {e}")

# ================= CREATE PAYMENT LINK =================
def create_payment_link(amount, job_id=None, user_id=None, user_name="PrintX User"):
    """
    Creates Razorpay link and logs it to the database.
    """
    try:
        # Razorpay expects amount in paise (Rupees * 100)
        payload = {
            "amount": int(amount * 100),
            "currency": "INR",
            "description": f"PrintX Job ID: {job_id}",
            "customer": {
                "name": user_name,
                "email": "customer@printx.bot" # Placeholder
            },
            "notify": {
                "sms": False,
                "email": False
            },
            "notes": {
                "job_id": job_id,
                "user_id": str(user_id)
            }
        }

        payment = client.payment_link.create(payload)
        short_url = payment["short_url"]

        # If we have a job_id, log this to our database immediately
        if job_id and user_id:
            log_payment_attempt(job_id, user_id, amount, short_url)

        return short_url

    except Exception as e:
        print("❌ Razorpay Error:", e)
        return None