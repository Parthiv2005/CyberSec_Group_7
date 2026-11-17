from pathlib import Path
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from converter import (
    BASE_DIR,
    CONVERTED_DIR,
    cleanup_temporary_files,
    convert_image,
    get_imagemagick_binary,
    save_uploaded_file,
)

app = FastAPI(
    title="Convertly - Online Image Converter",
    description="Minimal and fast image conversion platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = BASE_DIR / "frontend"


@app.on_event("startup")
def startup_event():
    cleanup_temporary_files()


@app.get("/api/health")
def health_check():
    """Checks ImageMagick status."""
    try:
        binary = get_imagemagick_binary()
        return {"status": "ok", "imagemagick_binary": binary}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/convert")
async def api_convert(
    file: UploadFile = File(...),
    output_filename: str = Form(...),
):
    """
    Primary image conversion endpoint.
    Calls convert_image() in converter.py.
    """
    input_path = await save_uploaded_file(file)
    result = convert_image(input_path, output_filename.strip())
    return result


@app.get("/api/download/{filename:path}")
def api_download(filename: str):
    """Safe download endpoint restricted to converted directory."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename format.")

    file_path = CONVERTED_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Requested file does not exist.")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


# Mount static frontend files
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
