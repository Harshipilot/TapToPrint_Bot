import time
import io
import asyncio
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# ================= GLOBAL QUEUE =================
print_queue = []

TIME_PER_PAGE = 2  # seconds per page simulation delay


# ================= GENERATE PRINT ID =================
def generate_print_id():
    return f"PX{int(time.time())}"


# ================= ADD JOB TO QUEUE =================
def add_to_queue(pages, copies):
    print_id = generate_print_id()

    job = {
        "id": print_id,
        "pages": pages,
        "copies": copies
    }

    print_queue.append(job)

    return print_id, len(print_queue)


# ================= CALCULATE WAIT TIME =================
def calculate_wait_time():
    wait_time = 0

    for job in print_queue[:-1]:
        wait_time += job["pages"] * job["copies"] * TIME_PER_PAGE

    return wait_time


def add_print_id_to_pdf(input_pdf, output_pdf, print_id):
    reader = PdfReader(input_pdf)
    writer = PdfWriter()

    for page in reader.pages:
        packet = io.BytesIO()

        page_width = float(page.mediabox.width)
        page_height = float(page.mediabox.height)

        can = canvas.Canvas(packet, pagesize=(page_width, page_height))

        can.saveState()

        # Move to top-left margin
        can.translate(25, page_height - 100)

        # Rotate vertically (downwards)
        can.rotate(270)

        can.setFont("Helvetica-Bold", 10)

        # 🔥 SHIFT TEXT INSIDE (CRITICAL FIX)
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


# ================= PROCESS PRINT JOB =================
async def process_print_job(context):
    final_pdf = context.user_data.get("final_pdf")
    start = context.user_data.get("start")
    end = context.user_data.get("end")
    copies = context.user_data.get("copies")

    pages = end - start + 1

    # ===== ADD TO QUEUE =====
    print_id, position = add_to_queue(pages, copies)

    wait_time = calculate_wait_time()

    # ===== OUTPUT FILE =====
    output_pdf = final_pdf.replace(".pdf", "_with_id.pdf")

    # ===== ADD PRINT ID TO PDF (RUN IN THREAD) =====
    await asyncio.to_thread(
        add_print_id_to_pdf,
        final_pdf,
        output_pdf,
        print_id
    )

    return {
        "print_id": print_id,
        "position": position,
        "wait_time": wait_time,
        "pdf": output_pdf
    }