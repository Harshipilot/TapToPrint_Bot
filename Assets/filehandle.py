import os
import subprocess
from PyPDF2 import PdfReader
from PIL import Image

# ================= CONVERT TO PDF =================
def convert_to_pdf(file_path):
    ext = file_path.split('.')[-1].lower()

    # Already PDF
    if ext == "pdf":
        return file_path

    # DOCX → PDF
    if ext in ["doc", "docx"]:
        output_dir = os.path.dirname(file_path)

        subprocess.run([
            "libreoffice",
            "--headless",
            "--convert-to",
            "pdf",
            file_path,
            "--outdir",
            output_dir
        ])

        return file_path.rsplit('.', 1)[0] + ".pdf"

    # IMAGE → PDF
    if ext in ["jpg", "jpeg", "png"]:
        img = Image.open(file_path)
        pdf_path = file_path.rsplit('.', 1)[0] + ".pdf"

        img.convert("RGB").save(pdf_path)

        return pdf_path

    return None

# ================= PAGE COUNT =================
def get_page_count(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        return len(reader.pages)
    except:
        return 0

# ================= COST CALCULATION =================
def calculate_cost(pages, copies, color):
    if color:
        price_per_page = 10   # ₹10 per page (color)
    else:
        price_per_page = 3    # ₹3 per page (B/W)

    total = pages * copies * price_per_page
    return total