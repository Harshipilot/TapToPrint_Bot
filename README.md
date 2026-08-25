# PrintX

PrintX is a hybrid print management system that combines a Telegram bot, CUPS printer integration, Razorpay payment links, and a React-based admin dashboard. It is designed for secure file receipt, PDF conversion, payment collection, queue management, and printer monitoring.

---

## 🚀 Project Overview

PrintX allows users to send files through Telegram, select print options, pay for jobs, and then routes print-ready documents through CUPS. The project also includes an admin panel for monitoring live print jobs, payments, and printer health.

---

## ✨ Key Features

### Telegram Bot Features

- Secure file upload via Telegram
- Malware scan before processing
- File conversion to PDF for office documents, images, and text files
- Page selection and trimming support
- Copy count and color/BW pricing
- Razorpay payment link generation and payment logging
- Print queue management with estimated wait time
- Print ID watermark added to every page
- Location-based shop finder using OpenStreetMap / fallback generator

### Admin Panel Features

- React-based dashboard for print and payment overview
- Flask API backend serving print job, payment, printer, and stats data
- Download completed job files from the API
- Basic dashboard statistics: total jobs, revenue, pending/completed jobs
- CORS enabled for seamless frontend/backend communication

### Printer Integration

- CUPS integration via `pycups`
- Auto-detects available printers
- Sends PDF jobs to the configured CUPS printer
- Designed to work with CUPS on port `631`

---

## 🧩 Architecture

- `bot.py` — Telegram bot entrypoint and conversation flow
- `web_app.py` — Flask API for admin panel and file downloads
- `Assets/` — core utility modules for DB, conversion, payment, scanning, queue, and location logic
- `pipeline/` — processing helpers for queue management and payment
- `print-admin/` — React admin dashboard
- `user_files/` — persistent storage for processed PDF jobs
- `downloads/` — temporary file storage for incoming uploads

---

## 📦 Requirements

### Python Backend

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

### Admin Frontend

Install React dependencies inside `print-admin/`:

```bash
cd print-admin
npm install
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root with the following values:

```env
BOT_TOKEN=your_telegram_bot_token
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## 🚀 Running the Project

### Start the Telegram Bot

```bash
python bot.py
```

### Start the Flask Admin API

```bash
python web_app.py
```

### Start the React Admin Panel

```bash
cd print-admin
npm start
```

---

## 🧪 Endpoints

| Route | Description |
|---|---|
| `/api/print_jobs` | Get all print job records |
| `/api/payments` | Get all payment records |
| `/api/printers` | Get printer status records |
| `/api/download/<job_id>` | Download the PDF for a completed job |
| `/api/stats` | Get dashboard summary stats |

---

## 🖼️ Screenshots

### Telegram Bot

![Telegram Bot Screenshot](assets/telegram-bot.png)

> Replace with your Telegram bot interface screenshot.

### Admin Panel

![Admin Panel Screenshot](assets/admin-panel.png)

> Replace with your admin dashboard screenshot.

### CUPS Port

![CUPS Port 631](assets/cups-port-631.png)

> Replace with your CUPS port / printer status screenshot.

---

## 📝 Notes

- CUPS normally listens on port `631`; make sure the CUPS service is running and accessible.
- LibreOffice is required for converting office file formats to PDF.
- The project currently uses `sqlite3` for database storage and is built for local or small-scale deployment.
- `user_files/` is used to store final printable PDFs.

---

## 💡 Future Enhancements

- Add authentication for the admin panel
- Improve job retry handling for printer failures
- Support more file formats and better image resizing
- Add real Razorpay payment verification webhooks
- Add multi-printer selection and printer load balancing

---

## 📁 Project Structure

```text
PRINTBOT/
├── bot.py
├── web_app.py
├── requirements.txt
├── Assets/
│   ├── clamav.py
│   ├── database.py
│   ├── filehandle.py
│   ├── location_service.py
│   ├── payment.py
│   ├── queue_system.py
├── pipeline/
│   ├── payment.py
│   ├── queue_system.py
├── print-admin/
│   ├── package.json
│   ├── src/
│   └── public/
├── downloads/
├── user_files/
└── README.md
```

---

## 📌 License

Add your project license here.
