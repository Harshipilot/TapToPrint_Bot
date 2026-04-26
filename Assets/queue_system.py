import time
import io
import os
import asyncio
import sqlite3
import shutil
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from Assets.database import log_print_job, update_file_path

# ================= CONFIG & DB =================
DB_NAME = "printx.db"
print_queue = []
TIME_PER_PAGE = 2  # seconds per page simulation delay

def update_db_status(job_id, status):
    """Helper to update job status in SQLite."""
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("UPDATE print_jobs SET status = ? WHERE job_id = ?", (status, job_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"❌ Queue DB Error: {e}")

# ================= ADD JOB TO QUEUE =================
def add_to_queue(pages, copies, print_id):
    job = {
        "id": print_id,
        "pages": pages,
        "copies": copies
    }
    print_queue.append(job)
    return len(print_queue)

# ================= CALCULATE WAIT TIME =================
def calculate_wait_time():
    wait_time = 0
    # Calculate time based on previous jobs in queue
    for job in print_queue[:-1]:
        wait_time += job["pages"] * job["copies"] * TIME_PER_PAGE
    return wait_time

# ================= PDF OVERLAY LOGIC =================
def add_print_id_to_pdf(input_pdf, output_pdf, print_id):
    """Adds the Print ID watermark to the side of every page."""
    reader = PdfReader(input_pdf)
    writer = PdfWriter()

    for page in reader.pages:
        packet = io.BytesIO()
        page_width = float(page.mediabox.width)
        page_height = float(page.mediabox.height)

        can = canvas.Canvas(packet, pagesize=(page_width, page_height))
        can.saveState()
        
        # Position: Top-left margin, rotated vertically
        can.translate(25, page_height - 100)
        can.rotate(270)
        can.setFont("Helvetica-Bold", 10)
        can.drawString(-100, 0, f"PRINT ID: {print_id}")
        
        can.restoreState()
        can.save()

        packet.seek(0)
        overlay = PdfReader(packet)
        page.merge_page(overlay.pages[0])
        writer.add_page(page)

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return output_pdf

# ================= PROCESS PRINT JOB (DB INTEGRATED) =================
async def process_print_job(context, update):
    """
    1. Generates ID
    2. Logs Job to Database
    3. Overlays ID on PDF
    4. Updates Queue
    """
    user = update.message.from_user
    final_pdf = context.user_data.get("final_pdf")
    start = context.user_data.get("start")
    end = context.user_data.get("end")
    copies = context.user_data.get("copies")
    cost = context.user_data.get("cost")
    file_name = context.user_data.get("file_name", "Unknown_File")

    pages = end - start + 1
    print_id = context.user_data["print_id"]

    # 1. LOG TO DATABASE (Initial Entry)
    db_data = {
        "id": print_id,
        "u_id": user.id,
        "u_name": user.full_name,
        "f_name": file_name,
        "f_path": final_pdf,
        "pages": pages,
        "copies": copies,
        "p_id": "CUPS_LMM_01", # Default Printer ID
        "amount": cost
    }
    log_print_job(db_data)
    update_db_status(print_id, "PROCESSING_PDF")

    # 2. ADD TO LOCAL MEMORY QUEUE
    position = add_to_queue(pages, copies, print_id)
    wait_time = calculate_wait_time()

    # 3. GENERATE WATERMARKED PDF
    output_pdf = final_pdf.replace(".pdf", "_with_id.pdf")
    await asyncio.to_thread(
        add_print_id_to_pdf,
        final_pdf,
        output_pdf,
        print_id
    )

    # Move to persistent storage
    persistent_path = os.path.join(os.getcwd(), "user_files", f"{print_id}.pdf")
    shutil.move(output_pdf, persistent_path)

    # Update DB with persistent path
    update_file_path(print_id, persistent_path)

    # 4. UPDATE STATUS TO READY
    update_db_status(print_id, "READY_TO_PRINT")

    return {
        "print_id": print_id,
        "position": position,
        "wait_time": wait_time,
        "pdf": persistent_path,
        "amount": cost
    }