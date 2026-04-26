import os
import subprocess
import sqlite3
import shutil
from PyPDF2 import PdfReader, PdfWriter
from PIL import Image

DB_NAME = "printx.db"

# ================= DATABASE LOGGER =================
def update_job_status(job_id, status):
    """Internal helper to update job status in the DB."""
    if not job_id:
        return

    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE print_jobs SET status = ? WHERE job_id = ?",
            (status, job_id)
        )
        conn.commit()
        conn.close()

    except Exception as e:
        print(f"DB Error in filehandle: {e}")


# ================= CONVERT TO PDF =================
def convert_to_pdf(file_path, job_id=None):
    """
    Converts supported files to PDF.

    Supported:
    - PDF
    - DOC, DOCX
    - PPT, PPTX
    - XLS, XLSX
    - ODT, ODS, ODP
    - TXT
    - JPG, JPEG, PNG
    """

    ext = file_path.split('.')[-1].lower()

    # Already PDF
    if ext == "pdf":
        return file_path

    update_job_status(job_id, "CONVERTING")

    try:
        # Office file conversion using LibreOffice
        office_formats = [
            "doc", "docx",
            "ppt", "pptx",
            "xls", "xlsx",
            "odt", "ods", "odp",
            "txt"
        ]

        if ext in office_formats:
            # Check LibreOffice installed
            if not shutil.which("libreoffice"):
                print("LibreOffice is not installed.")
                update_job_status(job_id, "CONVERSION_FAILED")
                return None

            output_dir = os.path.dirname(file_path)

            subprocess.run([
                "libreoffice",
                "--headless",
                "--convert-to", "pdf",
                file_path,
                "--outdir", output_dir
            ], check=True)

            pdf_path = file_path.rsplit('.', 1)[0] + ".pdf"

            if os.path.exists(pdf_path):
                return pdf_path
            else:
                print("PDF conversion failed: output file not created.")
                update_job_status(job_id, "CONVERSION_FAILED")
                return None

        # Image conversion using Pillow
        elif ext in ["jpg", "jpeg", "png"]:
            img = Image.open(file_path)

            if img.mode != "RGB":
                img = img.convert("RGB")

            pdf_path = file_path.rsplit('.', 1)[0] + ".pdf"
            img.save(pdf_path)

            if os.path.exists(pdf_path):
                return pdf_path
            else:
                print("Image to PDF conversion failed.")
                update_job_status(job_id, "CONVERSION_FAILED")
                return None

        else:
            print(f"Unsupported file type: {ext}")
            update_job_status(job_id, "UNSUPPORTED_FILE")
            return None

    except subprocess.CalledProcessError as e:
        print(f"LibreOffice conversion failed: {e}")
        update_job_status(job_id, "CONVERSION_FAILED")
        return None

    except Exception as e:
        print(f"Conversion Error: {e}")
        update_job_status(job_id, "CONVERSION_FAILED")
        return None


# ================= PAGE COUNT =================
def get_page_count(pdf_path):
    """Returns number of pages in a PDF."""
    try:
        reader = PdfReader(pdf_path)
        return len(reader.pages)
    except Exception as e:
        print(f"Page Count Error: {e}")
        return 0


# ================= TRIM PDF =================
def trim_pdf(pdf_path, start, end):
    """
    Trims the PDF and returns the trimmed PDF path.
    start and end are 1-based inclusive.
    """
    try:
        reader = PdfReader(pdf_path)
        writer = PdfWriter()

        total_pages = len(reader.pages)

        if start < 1 or end > total_pages or start > end:
            print("Invalid page range")
            return None

        for i in range(start - 1, end):
            writer.add_page(reader.pages[i])

        output_path = pdf_path.replace(".pdf", "_trimmed.pdf")

        with open(output_path, "wb") as f:
            writer.write(f)

        return output_path

    except Exception as e:
        print(f"Trimming Error: {e}")
        return None


# ================= COST CALCULATION =================
def calculate_cost(pages, copies, color):
    """
    Standard Pricing:
    BW: ₹3 per page
    Color: ₹10 per page
    """
    price_per_page = 10 if color else 3
    total_cost = pages * copies * price_per_page
    return total_cost