import os
import uuid
from dotenv import load_dotenv

from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters
)

# ✅ IMPORTS
from Assets.clamav import scan_file
from Assets.filehandle import convert_to_pdf, get_page_count, calculate_cost

# ================= LOAD ENV =================
load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise ValueError("❌ BOT_TOKEN not found in .env file")

# ================= START COMMAND =================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🌟 *Welcome to PrintX*\n\n"
        "🖨️ Secure document printing\n\n"
        "📤 Send a file to begin",
        parse_mode="Markdown"
    )

# ================= HANDLE TEXT =================
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📎 Please upload a document (PDF, DOCX, Image)."
    )

# ================= HANDLE FILE =================
async def handle_file(update: Update, context: ContextTypes.DEFAULT_TYPE):
    document = update.message.document

    os.makedirs("downloads", exist_ok=True)

    unique_name = f"{uuid.uuid4()}_{document.file_name}"
    file_path = f"./downloads/{unique_name}"

    msg = await update.message.reply_text("📥 Receiving your file...")

    file = await document.get_file()
    await file.download_to_drive(file_path)

    context.user_data["file_path"] = file_path

    # ===== FILE INFO =====
    file_size = document.file_size / (1024 * 1024)

    await msg.edit_text(
        f"📄 *File Received*\n\n"
        f"📌 Name: `{document.file_name}`\n"
        f"📦 Size: `{file_size:.2f} MB`\n\n"
        f"🛡️ Starting security scan...",
        parse_mode="Markdown"
    )

    # ===== CLAMAV SCAN =====
    is_safe, stats = scan_file(file_path)

    if not is_safe:
        await msg.edit_text(
            f"❌ *Threat Detected*\n\n"
            f"🛡️ Engine: {stats.get('engine')}\n"
            f"⏱️ Scan Time: {stats.get('scan_time')} sec\n\n"
            f"🚫 File rejected for safety.",
            parse_mode="Markdown"
        )

        try:
            os.remove(file_path)
        except:
            pass

        return

    # ===== SAFE FILE =====
    await msg.edit_text(
        f"✅ *Security Check Passed*\n\n"
        f"🛡️ Engine: {stats.get('engine')}\n"
        f"⏱️ Scan Time: {stats.get('scan_time')} sec\n\n"
        f"⚙️ Processing file...",
        parse_mode="Markdown"
    )

    # ===== FILE PROCESSING =====
    pdf_path = convert_to_pdf(file_path)

    if not pdf_path:
        await msg.edit_text("❌ Unsupported file format.")
        return

    pages = get_page_count(pdf_path)

    # Default values
    copies = 1
    color = False

    cost = calculate_cost(pages, copies, color)

    # Store for next steps
    context.user_data["pdf_path"] = pdf_path
    context.user_data["pages"] = pages
    context.user_data["copies"] = copies
    context.user_data["color"] = color
    context.user_data["cost"] = cost

    # ===== SEND PROCESSED PDF =====
    await msg.edit_text("📤 Sending processed PDF...")

    with open(pdf_path, "rb") as pdf_file:
        await update.message.reply_document(
            document=pdf_file,
            filename=document.file_name.rsplit('.', 1)[0] + ".pdf",
            caption="📄 Processed PDF ready.\n\nYou can download and verify before printing."
        )

    # ===== FINAL OUTPUT =====
    await msg.edit_text(
        f"📄 *Processing Complete*\n\n"
        f"📑 Pages: {pages}\n"
        f"📄 Copies: {copies}\n"
        f"{'🌈 Color' if color else '🖤 B/W'}\n"
        f"💰 Cost: ₹{cost}\n\n"
        f"🚀 Ready for next step",
        parse_mode="Markdown"
    )

# ================= MAIN =================
app = ApplicationBuilder().token(TOKEN).build()

app.add_handler(CommandHandler("start", start))
app.add_handler(MessageHandler(filters.Document.ALL, handle_file))
app.add_handler(MessageHandler(filters.TEXT, handle_text))

print("🚀 Bot running (Phase 3 - Processing + PDF Return)...")
app.run_polling()