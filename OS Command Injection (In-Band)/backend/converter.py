import os
import shutil
import subprocess
import time
from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException, UploadFile

# Directory configuration
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
CONVERTED_DIR = BASE_DIR / "converted"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CONVERTED_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit


def get_imagemagick_binary() -> str:
    """Detects available ImageMagick CLI binary ('magick' or legacy 'convert')."""
    for binary in ["magick", "convert"]:
        path = shutil.which(binary)
        if path:
            return path
    raise RuntimeError("ImageMagick executable ('magick' or 'convert') not found on system.")


def validate_upload(file: UploadFile) -> str:
    """Validates uploaded file type and extension."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME type '{file.content_type}'. Must be an image.",
        )

    return ext


def check_path_traversal(filename: str):
    """Prevents directory traversal while allowing shell metacharacters for the lab."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(
            status_code=400,
            detail="Directory traversal detected. Slashes and '..' are not permitted in filename.",
        )


async def save_uploaded_file(file: UploadFile) -> Path:
    """Saves uploaded image to local temporary storage with size check."""
    ext = validate_upload(file)
    safe_name = f"{uuid4().hex[:12]}{ext}"
    dest_path = UPLOAD_DIR / safe_name

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

    with open(dest_path, "wb") as f:
        f.write(contents)

    return dest_path


def cleanup_temporary_files(max_age_seconds: int = 3600):
    """Cleans up temporary uploaded and converted files older than max_age_seconds."""
    now = time.time()
    for directory in [UPLOAD_DIR, CONVERTED_DIR]:
        for item in directory.glob("*"):
            if item.is_file() and item.name != ".gitkeep":
                try:
                    if now - item.stat().st_mtime > max_age_seconds:
                        item.unlink()
                except OSError:
                    pass


def convert_image(input_path: Path, output_filename: str) -> dict:
    """
    Image conversion routine.
    Currently VULNERABLE: uses string formatting and shell=True.
    """
    check_path_traversal(output_filename)
    executable = get_imagemagick_binary()
    output_target = f"{CONVERTED_DIR}/{output_filename}"

    # =========================================================================
    # VULNERABLE IMPLEMENTATION (Demonstrated in Video Step 2 & 3)
    # String formatting + shell=True allows shell metacharacters (e.g. ;)
    # =========================================================================
    # command = f"{executable} {input_path} {output_target}"
    # result = subprocess.run(
    #     command,
    #     shell=True,
    #     capture_output=True,
    #     text=True,
    #     timeout=10,
    # )

    # =========================================================================
    # MITIGATION FIX (Switch to this in Video Step 4)
    # Argument-vector list + shell=False prevents shell command execution!
    # =========================================================================
    command = [executable, str(input_path), output_target]
    result = subprocess.run(
        command,
        shell=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    # =========================================================================

    base_name = output_filename.split(";")[0].strip() if ";" in output_filename else output_filename
    target_file = CONVERTED_DIR / base_name
    has_file = target_file.exists() and target_file.is_file() and result.returncode == 0

    return {
        "success": result.returncode == 0,
        "executed_command": str(command) if isinstance(command, list) else command,
        "return_code": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "download_url": f"/api/download/{base_name}" if has_file else None,
        "output_filename": base_name if has_file else None,
    }
