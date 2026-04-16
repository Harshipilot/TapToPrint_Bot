import os
import uuid
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

from Assets.clamav import scan_file
from Assets.filehandle import (
    convert_to_pdf,
    get_page_count,
    trim_pdf,
    calculate_cost
)

# ================= STATES =================
ASK_PAGES, ASK_COPIES, ASK_COLOR = range(3)

# ================= LOAD ENV =================
load_dotenv()
TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise ValueError("❌ BOT_TOKEN not found")

# ================= START =================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🌟 *Welcome to PrintX*\n\n"
        "🖨️ Smart & Secure Printing\n\n"
        "📤 Send a file to begin",
        parse_mode="Markdown"
    )

# ================= HANDLE FILE =================
async def handle_file(update: Update, context: ContextTypes.DEFAULT_TYPE):
    document = update.message.document

    os.makedirs("downloads", exist_ok=True)

    file_path = f"./downloads/{uuid.uuid4()}_{document.file_name}"

    msg = await update.message.reply_text("📥 Receiving file...")

    file = await document.get_file()
    await file.download_to_drive(file_path)

    # ===== FILE INFO =====
    file_size = document.file_size / (1024 * 1024)

    await msg.edit_text(
        f"📄 *File Received*\n\n"
        f"📌 Name: `{document.file_name}`\n"
        f"📦 Size: `{file_size:.2f} MB`\n\n"
        f"🛡️ Starting security scan...",
        parse_mode="Markdown"
    )

    # ===== SCAN =====
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

        return ConversationHandler.END

    # ===== SAFE FILE =====
    await msg.edit_text(
        f"✅ *Security Check Passed*\n\n"
        f"🛡️ Engine: {stats.get('engine')}\n"
        f"⏱️ Scan Time: {stats.get('scan_time')} sec\n\n"
        f"⚙️ Converting to PDF...",
        parse_mode="Markdown"
    )

    # ===== CONVERT =====
    pdf_path = convert_to_pdf(file_path)

    if not pdf_path:
        await msg.edit_text("❌ Unsupported file format.")
        return ConversationHandler.END

    pages = get_page_count(pdf_path)

    # ===== STORE DATA =====
    context.user_data["pdf_path"] = pdf_path
    context.user_data["total_pages"] = pages

    # ===== NEXT STEP =====
    await msg.edit_text(
        f"📄 *File Ready*\n\n"
        f"📑 Total Pages: `{pages}`\n\n"
        f"✂️ Enter page range (e.g. `1-5` or `all`):",
        parse_mode="Markdown"
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
            await update.message.reply_text(
                f"❌ Invalid format.\nUse `1-5` or `all` (Max pages: {total})",
                parse_mode="Markdown"
            )
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
        await update.message.reply_text("❌ Enter a valid number (>0)")
        return ASK_COPIES

    context.user_data["copies"] = copies

    await update.message.reply_text("🎨 Type `color` or `bw`:", parse_mode="Markdown")
    return ASK_COLOR

# ================= ASK COLOR + FINAL =================
async def ask_color(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.lower()

    if text not in ["color", "bw"]:
        await update.message.reply_text("❌ Type only `color` or `bw`", parse_mode="Markdown")
        return ASK_COLOR

    color = True if text == "color" else False

    pdf_path = context.user_data["pdf_path"]
    start = context.user_data["start"]
    end = context.user_data["end"]
    copies = context.user_data["copies"]

    # ===== TRIM PDF =====
    final_pdf = trim_pdf(pdf_path, start, end)

    pages = end - start + 1
    cost = calculate_cost(pages, copies, color)

    # ===== SEND FINAL FILE =====
    with open(final_pdf, "rb") as f:
        await update.message.reply_document(
            document=f,
            filename="final_print.pdf",
            caption=(
                f"✅ *Ready to Print*\n\n"
                f"📑 Pages: `{pages}`\n"
                f"📄 Copies: `{copies}`\n"
                f"{'🌈 Color' if color else '🖤 B/W'}\n"
                f"💰 Cost: `₹{cost}`"
            ),
            parse_mode="Markdown"
        )

    return ConversationHandler.END

# ================= TEXT FALLBACK =================
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📎 Please send a valid file")

# ================= MAIN =================
app = ApplicationBuilder().token(TOKEN).build()

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
app.add_handler(MessageHandler(filters.TEXT, handle_text))

print("🚀 PrintX Bot Running (Full Smart Flow)...")
app.run_polling()