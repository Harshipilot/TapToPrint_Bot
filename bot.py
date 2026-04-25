import os
import uuid
import asyncio
import cups
from dotenv import load_dotenv

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

from pipeline.payment import create_payment_link
from pipeline.queue_system import process_print_job

# ================= STATES =================
ASK_PAGES, ASK_COPIES, ASK_COLOR = range(3)

# ================= LOAD ENV =================
load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise ValueError("❌ BOT_TOKEN not found")

# ================= CUPS PRINT FUNCTION =================
def send_to_printer(file_path):
    try:
        conn = cups.Connection()
        printers = conn.getPrinters()

        if not printers:
            print("❌ No printers found")
            return False

        printer_name = list(printers.keys())[0]

        conn.printFile(printer_name, file_path, "PrintX Job", {})

        print(f"✅ Sent to printer: {printer_name}")
        return True

    except Exception as e:
        print("❌ CUPS Error:", e)
        return False

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

    is_safe, _ = await asyncio.to_thread(scan_file, file_path)

    if not is_safe:
        await msg.edit_text("❌ Threat detected. File rejected.")
        return ConversationHandler.END

    await msg.edit_text("✅ Safe file\n⚙️ Converting...")

    pdf_path = await asyncio.to_thread(convert_to_pdf, file_path)

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
            await update.message.reply_text("❌ Invalid format")
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
        await update.message.reply_text("❌ Enter valid number")
        return ASK_COPIES

    context.user_data["copies"] = copies

    await update.message.reply_text("🎨 Type color or bw:")
    return ASK_COLOR

# ================= PAYMENT =================
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

    payment_link = create_payment_link(cost)

    if not payment_link:
        await update.message.reply_text("❌ Payment failed")
        return ConversationHandler.END

    context.user_data["final_pdf"] = final_pdf

    await update.message.reply_text(
        f"💳 <b>Payment Required</b>\n\n"
        f"💰 Amount: ₹{cost}\n\n"
        f"👉 <a href='{payment_link}'>Pay Now</a>\n\n"
        f"After payment type <b>paid</b>",
        parse_mode="HTML"
    )

    return ConversationHandler.END

# ================= FINAL STEP =================
async def check_payment(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.text.lower() != "paid":
        return

    if not context.user_data.get("final_pdf"):
        await update.message.reply_text("❌ No pending order")
        return

    await update.message.reply_text("⏳ Processing print job...")

    result = await process_print_job(context)

    print_id = result["print_id"]
    position = result["position"]
    wait_time = result["wait_time"]
    pdf = result["pdf"]

    await update.message.reply_text(
        f"✅ Payment confirmed!\n\n"
        f"🆔 Print ID: {print_id}\n"
        f"📍 Queue Position: {position}\n"
        f"⏳ Wait Time: {wait_time} sec\n\n"
        f"🖨️ Printing started..."
    )

    # Send file to user
    with open(pdf, "rb") as f:
        await update.message.reply_document(
            document=f,
            filename="final_print.pdf"
        )

    # 🔥 PRINT USING CUPS
    printed = await asyncio.to_thread(send_to_printer, pdf)

    if printed:
        await update.message.reply_text("🖨️ Sent to printer!")
    else:
        await update.message.reply_text("❌ Printer error")

# ================= FALLBACK =================
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📎 Send a file to start")

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
    },
    fallbacks=[]
)

app.add_handler(CommandHandler("start", start))
app.add_handler(conv_handler)

app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, check_payment))
app.add_handler(MessageHandler(filters.TEXT, handle_text))

print("🚀 PrintX Bot Running with CUPS + Queue...")
app.run_polling()