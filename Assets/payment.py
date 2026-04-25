import os
import razorpay
from dotenv import load_dotenv

load_dotenv()

KEY_ID = os.getenv("RAZORPAY_KEY_ID")
KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

if not KEY_ID or not KEY_SECRET:
    raise ValueError("❌ Razorpay keys not found")

client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))


def create_payment_link(amount):
    try:
        payment = client.payment_link.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "description": "PrintX Payment",
            "customer": {
                "name": "PrintX User",
                "email": "test@example.com"
            },
            "notify": {
                "sms": False,
                "email": False
            }
        })

        return payment["short_url"]

    except Exception as e:
        print("❌ Razorpay Error:", e)
        return None