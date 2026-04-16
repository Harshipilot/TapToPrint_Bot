import subprocess
import time

def get_clamav_version():
    try:
        result = subprocess.run(
            ["clamscan", "--version"],
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    except:
        return "ClamAV"

def scan_file(file_path):
    """
    Scan file using ClamAV

    Returns:
        (bool, dict)
        True  -> safe
        False -> infected
        dict  -> stats (scan_time, engine)
    """
    start_time = time.time()

    try:
        result = subprocess.run(
            ["clamscan", file_path],
            capture_output=True,
            text=True
        )

        scan_time = round(time.time() - start_time, 2)
        output = result.stdout

        is_safe = "Infected files: 0" in output

        return is_safe, {
            "scan_time": scan_time,
            "engine": get_clamav_version()
        }

    except Exception as e:
        return False, {
            "scan_time": 0,
            "engine": "Error",
            "error": str(e)
        }