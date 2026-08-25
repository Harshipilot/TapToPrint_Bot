import os
import uuid
import asyncio
import subprocess
import threading
import cups
from dotenv import load_dotenv
from Assets.database import init_db
import zipfile

init_db()

from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
    ConversationHandler
)
from telegram.request import HTTPXRequest

from Assets.clamav import scan_file
from Assets.filehandle import (
    convert_to_pdf,
    get_page_count,
    trim_pdf,
    calculate_cost
)

from Assets.database import record_payment, get_job_file, update_job_status, update_printer_id
from Assets.payment import create_payment_link
from Assets.queue_system import process_print_job
from Assets.location_service import find_nearest_printer

# ================= STATES =================
ASK_PAGES, ASK_COPIES, ASK_COLOR, ASK_LOCATION, ASK_SHOP, ASK_PAYMENT = range(6)

# ================= LOAD ENV =================
load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise ValueError("❌ BOT_TOKEN not found")

# ================= CUPS PRINT FUNCTION =================
def send_to_printer(file_path):
    def print_job():
        try:
            abs_path = os.path.abspath(file_path)
            if not os.path.exists(abs_path):
                print(f"❌ File not found: {abs_path}")
                return False
            print(f"📄 Printing file: {abs_path}")
            conn = cups.Connection()
            printers = conn.getPrinters()
            if not printers:
                print("❌ No printers found")
                return False
            printer_name = list(printers.keys())[0]
            conn.printFile(printer_name, abs_path, "PrintX Job", {})
            print(f"✅ Sent to printer: {printer_name}")
            return True
        except Exception as e:
            print("❌ CUPS Error:", e)
            return False

    result = [None]
    def wrapper():
        result[0] = print_job()
    t = threading.Thread(target=wrapper)
    t.start()
    t.join(30)  # 30 seconds timeout
    if t.is_alive():
        print("❌ Print timeout")
        return False
    return result[0] if result[0] is not None else False

# ================= START =================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🌟 Welcome to PrintX\n\n"
        "🖨️ Smart & Secure Printing\n\n"
        "📤 Send a file to begin"
    )

# ================= HANDLE FILE =================
async def handle_file(update: Update, context: ContextTypes.DEFAULT_TYPE):
    document = update.message.document

    os.makedirs("downloads", exist_ok=True)
    file_path = f"./downloads/{uuid.uuid4()}_{document.file_name}"

    context.user_data["file_name"] = document.file_name

    msg = await update.message.reply_text("📥 Receiving file...")

    file = await document.get_file(read_timeout=60, write_timeout=60)
    await file.download_to_drive(file_path)

    file_size = document.file_size / (1024 * 1024)

    await msg.edit_text(
        f"📄 File Received\n\n"
        f"📌 Name: {document.file_name}\n"
        f"📦 Size: {file_size:.2f} MB\n\n"
        f"🛡️ Scanning..."
    )

    # Scan file
    is_safe, scan_stats = await asyncio.to_thread(scan_file, file_path)

    if not is_safe:
        await msg.edit_text("❌ Threat detected. File rejected.")
        return ConversationHandler.END

    await msg.edit_text(
        f"✅ Safe (Scan time: {scan_stats['scan_time']}s)\n⚙️ Converting..."
    )

    pdf_path = await asyncio.to_thread(
        convert_to_pdf,
        file_path,
        context.user_data.get("print_id")
    )

    if not pdf_path:
        await msg.edit_text("❌ Unsupported format.")
        return ConversationHandler.END

    pages = get_page_count(pdf_path)

    context.user_data["pdf_path"] = pdf_path
    context.user_data["total_pages"] = pages

    await msg.edit_text(
        f"📄 File Ready\n\n"
        f"📑 Pages: {pages}\n\n"
        f"✂️ Enter range (example: 1-5 or all):"
    )

    return ASK_PAGES

# ================= ASK PAGES =================
async def ask_pages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    total = context.user_data["total_pages"]

    if text.lower() == "all":
        start, end = 1, total
    else:
        try:
            start, end = map(int, text.split("-"))
            if start < 1 or end > total or start > end:
                raise ValueError
        except:
            await update.message.reply_text("❌ Invalid format. Use 1-5 or all")
            return ASK_PAGES

    context.user_data["start"] = start
    context.user_data["end"] = end

    await update.message.reply_text("📄 Enter number of copies:")
    return ASK_COPIES

# ================= ASK COPIES =================
async def ask_copies(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        copies = int(update.message.text)
        if copies <= 0:
            raise ValueError
    except:
        await update.message.reply_text("❌ Enter valid number (>0)")
        return ASK_COPIES

    context.user_data["copies"] = copies

    await update.message.reply_text("🎨 Type color or bw:")
    return ASK_COLOR

# ================= ASK COLOR - NOW ASKS FOR LOCATION =================
async def ask_color(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.lower()

    if text not in ["color", "bw"]:
        await update.message.reply_text("❌ Type only color or bw")
        return ASK_COLOR

    color = text == "color"

    pdf_path = context.user_data["pdf_path"]
    start = context.user_data["start"]
    end = context.user_data["end"]
    copies = context.user_data["copies"]

    final_pdf = await asyncio.to_thread(trim_pdf, pdf_path, start, end)

    pages = end - start + 1
    cost = calculate_cost(pages, copies, color)

    context.user_data["cost"] = cost
    context.user_data["color"] = color
    context.user_data["final_pdf"] = final_pdf
    context.user_data["pages"] = pages

    await update.message.reply_text("📍 Please share your location to select the nearest print shop.")
    return ASK_LOCATION

# ================= ASK LOCATION =================
async def ask_location(update: Update, context: ContextTypes.DEFAULT_TYPE):
    location = update.message.location
    if not location:
        await update.message.reply_text("❌ Please share your location.")
        return ASK_LOCATION

    user_lat = float(location.latitude)
    user_lon = float(location.longitude)

    nearest_printer = find_nearest_printer(user_lat, user_lon)
    if not nearest_printer:
        await update.message.reply_text(
            "❌ No subscribed printer is currently available. Please try again later."
        )
        return ConversationHandler.END

    context.user_data["selected_printer"] = nearest_printer
    context.user_data["selected_shop"] = {
        "name": nearest_printer["printer_name"],
        "address": f"{nearest_printer['printer_name']} ({nearest_printer['printer_id']})"
    }
    context.user_data["selected_choice"] = nearest_printer["printer_id"]

    await update.message.reply_text(
        "📍 Location received!\n\n"
        f"🖨️ Nearest printer: {nearest_printer['printer_name']}\n"
        f"📏 Distance: {nearest_printer['distance_km']:.2f} km\n\n"
        "Proceeding with your order..."
    )

    # NOW PROCEED TO PAYMENT
    cost = context.user_data.get("cost")

    # Generate print ID before payment
    print_id = str(uuid.uuid4())[:8]
    context.user_data["print_id"] = print_id

    payment_link = create_payment_link(
        amount=cost,
        job_id=print_id,
        user_id=update.message.from_user.id,
        user_name=update.message.from_user.full_name
    )

    if not payment_link:
        await update.message.reply_text("❌ Payment failed")
        return ConversationHandler.END

    await update.message.reply_text(
        f"💳 <b>Payment Required</b>\n\n"
        f"🆔 Job ID: {print_id}\n"
        f"📍 Printer: {nearest_printer['printer_name']}\n"
        f"💰 Amount: ₹{cost}\n\n"
        f"👉 <a href='{payment_link}'>Pay Now</a>\n\n"
        f"After payment type <b>paid</b>",
        parse_mode="HTML"
    )

    return ASK_PAYMENT

# ================= ASK SHOP SELECTION =================
async def ask_shop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    return ASK_PAYMENT

# ================= ASK PAYMENT (FINAL) =================
async def ask_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.text.lower() != "paid":
        await update.message.reply_text("❌ Type 'paid' to confirm payment")
        return ASK_PAYMENT

    if not context.user_data.get("final_pdf"):
        await update.message.reply_text("❌ No pending order")
        return ConversationHandler.END

    await update.message.reply_text("⏳ Processing print job...")

    result = await process_print_job(context, update)

    print_id = result["print_id"]
    record_payment(print_id, update.message.from_user.id, result["amount"], "manual_paid")

    position = result["position"]
    wait_time = result["wait_time"]
    pdf = result["pdf"]

    context.user_data["print_id"] = print_id
    context.user_data["pdf"] = pdf

    selected_printer = context.user_data.get("selected_printer")
    selected_choice = context.user_data.get("selected_choice")
    selected_shop = context.user_data.get("selected_shop")

    # Update printer_id and status
    if selected_printer and selected_printer.get("printer_id"):
        update_printer_id(print_id, selected_printer["printer_id"])
        selected_choice = selected_printer["printer_id"]
    else:
        update_printer_id(print_id, f"PRINTER_{selected_choice}")
    
    # Send to printer
    printed = await asyncio.to_thread(send_to_printer, pdf)
    
    if printed:
        update_job_status(print_id, "COMPLETED")
        await update.message.reply_text(
            f"✅ Payment confirmed & Job sent!\n\n"
            f"🆔 Print ID: {print_id}\n"
            f"📍 Queue Position: {position}\n"
            f"⏳ Wait Time: {wait_time} sec\n"
            f"🏪 Shop: {(selected_shop['name'] if selected_shop else (selected_printer['printer_name'] if selected_printer else 'Printer'))} (Printer: {selected_choice})\n\n"
            f"Collect your prints from there."
        )
    else:
        await update.message.reply_text("⚠️ Payment confirmed but printer error. Admin will contact you.")

    context.user_data.clear()
    return ConversationHandler.END

# ================= FALLBACK =================
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📎 Send a file to start")

# ================= EXPORT DATA =================
async def export_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    from Assets.database import export_all_data

    export_all_data()

    zip_path = 'printbot_export.zip'

    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file in ['exports/print_jobs.csv', 'exports/payments.csv', 'exports/printers.csv']:
            if os.path.exists(file):
                zipf.write(file, os.path.basename(file))

    with open(zip_path, 'rb') as f:
        await update.message.reply_document(document=f, filename='printbot_export.zip')

    # Clean up
    os.remove(zip_path)
    for file in ['exports/print_jobs.csv', 'exports/payments.csv', 'exports/printers.csv']:
        if os.path.exists(file):
            os.remove(file)
    os.rmdir('exports')

# ================= RETRIEVE FILE =================
async def retrieve(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Usage: /retrieve <job_id>")
        return

    job_id = context.args[0]
    user_id = update.message.from_user.id

    file_path = get_job_file(job_id, user_id)
    if not file_path or not os.path.exists(file_path):
        await update.message.reply_text("❌ File not found or access denied.")
        return

    with open(file_path, "rb") as f:
        await update.message.reply_document(document=f, filename=f"{job_id}.pdf")

    await update.message.reply_text("✅ File retrieved!")

# ================= MAIN =================
request = HTTPXRequest(
    connect_timeout=60,
    read_timeout=60,
    write_timeout=60,
    pool_timeout=60
)

app = ApplicationBuilder().token(TOKEN).request(request).build()

conv_handler = ConversationHandler(
    entry_points=[MessageHandler(filters.Document.ALL, handle_file)],
    states={
        ASK_PAGES: [MessageHandler(filters.TEXT, ask_pages)],
        ASK_COPIES: [MessageHandler(filters.TEXT, ask_copies)],
        ASK_COLOR: [MessageHandler(filters.TEXT, ask_color)],
        ASK_LOCATION: [MessageHandler(filters.LOCATION, ask_location)],
        ASK_SHOP: [MessageHandler(filters.TEXT, ask_shop)],
        ASK_PAYMENT: [MessageHandler(filters.TEXT, ask_payment)],
    },
    fallbacks=[]
)

app.add_handler(CommandHandler("start", start))
app.add_handler(conv_handler)
app.add_handler(CommandHandler("export", export_data))
app.add_handler(CommandHandler("retrieve", retrieve))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

print("🚀 PrintX Bot Running with CUPS + Queue...")
app.run_polling()