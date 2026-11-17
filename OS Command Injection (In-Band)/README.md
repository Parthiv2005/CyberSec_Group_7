# Convertly — Educational OS Command Injection Lab

**Course Assignment:** Cyber Security  
**Topic:** OS Command Injection (Variant 1: In-Band) and Argument-Vector Mitigation  

---

## Student & Submission Details

- **Student Name:** **Akshat Parmar**
- **Roll Number: IIT2024077**

---

## 1. Project Overview

**Convertly** is a minimalist web application for online image conversion (supporting PNG, JPG, JPEG, and WebP). Built specifically as an authentic, educational cyber security demonstration, it showcases:

1. **Vulnerable State:**  
   Constructs the ImageMagick OS command via unsanitized string formatting and executes it with `subprocess.run(..., shell=True)`. This leads to **In-Band OS Command Injection**, where arbitrary attacker-controlled commands run on the host server and return their output directly in the HTTP response and diagnostic panel.
2. **Mitigated State:**  
   Implements **Argument-Vector Execution** with `subprocess.run(..., shell=False)`. User-supplied parameters are passed as distinct argv array elements directly to the kernel `execve()` system call without invoking a shell interpreter (`/bin/sh`), neutralizing command injection.
3. **Authentic Single-Card UI:**  
   Designed to look like a realistic image conversion platform (no artificial side-by-side terminal). Technical diagnostics and in-band output are revealed via a collapsible engine inspector or directly in the browser's Network response (`F12`).

---

## 2. Technology Stack

- **Backend:** Python 3.12 + FastAPI (asynchronous ASGI framework)
- **ASGI Server:** Uvicorn
- **Image Processing CLI:** ImageMagick (`convert` / `magick`)
- **OS Subprocess Interface:** Python standard library `subprocess`
- **Frontend:** Vanilla HTML5, CSS3 (using **CSS Flexbox exclusively**, no CSS Grid), Vanilla JavaScript (Fetch API)
- **Storage:** Local temporary filesystem (`uploads/` and `converted/` with path traversal protections)
- **Security Boundary:** Bound exclusively to `127.0.0.1` (localhost)

---

## 3. Project Structure

```text
CS-Assignment/
├── backend/
│   ├── main.py             # FastAPI routing, app lifecycle, file download handler
│   ├── converter.py        # Shared file handling, ImageMagick detection, traversal checks
│   └── requirements.txt    # Python dependencies (fastapi, uvicorn, python-multipart)
│
├── frontend/
│   ├── index.html          # Clean, modern UI (Flexbox layout)
│   ├── style.css           # Minimalist design, terminal styling, responsive flex
│   └── script.js           # Upload handling, fetch API, live terminal output rendering
│
├── README.md               # Assignment documentation and report
└── .gitignore              # Repository hygiene
```

---

## 4. Installation Instructions (Ubuntu / Debian Linux)

### Step 1: Install System Dependencies

Convertly requires Python 3 (with `python3-venv`) and ImageMagick:

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv imagemagick
```

Verify ImageMagick is installed:
```bash
convert -version
# or
magick -version
```

### Step 2: Clone or Open the Repository

```bash
cd /path/to/CS-Assignment
```

### Step 3: Run Setup & Start the Application

You can use the automated startup script:

```bash
chmod +x run.sh
./run.sh
```

Or execute manually:

```bash
# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt

# 3. Start the FastAPI server (listening strictly on localhost)
python3 -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Open your browser at: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 5. How the Vulnerable Implementation Works

In `backend/vulnerable.py`, the backend constructs the ImageMagick CLI invocation by concatenating the user-supplied `output_filename` directly into a shell command string:

```python
# Unsanitized string interpolation
command = f"{executable} {input_path} {output_target}"

# Invoked with shell=True
result = subprocess.run(
    command,
    shell=True,
    capture_output=True,
    text=True,
    timeout=10,
)
```

When `shell=True` is passed to Python's `subprocess.run()`, Python executes the command using `/bin/sh -c "<command>"`. The Unix shell evaluates metacharacters (such as `;`, `&`, `|`, `` ` ``, `$()`) as syntactic delimiters rather than literal text.

---

## 6. Root Cause of Command Injection

The root cause of OS Command Injection is the **confusion between code and data**:

1. **Unsanitized Concatenation:** User input (`output_filename`) is concatenated directly into a command string without syntactic separation.
2. **Shell Intermediary (`shell=True`):** Calling `subprocess.run(..., shell=True)` delegates command parsing to `/bin/sh`. The shell parses the command line character-by-character, splitting tokens by shell delimiters.
3. **Execution of Secondary Commands:** Metacharacters like `;` signal the end of one command and the start of another. The shell executes each command sequentially with the privileges of the web application process.

---

## 7. Demonstration Payload & Expected Results

### Harmless Demonstration Payload

```text
converted.webp; whoami #
```

### Execution Flow in Vulnerable Version

When the user enters `converted.webp; whoami #`:

1. The backend builds the shell string:
   ```bash
   /usr/bin/convert uploads/test.png converted/converted.webp; whoami #
   ```
2. The shell `/bin/sh` decomposes this into two discrete commands:
   - **Command 1:** `/usr/bin/convert uploads/test.png converted/converted.webp`  
     *Result:* ImageMagick converts the image and produces `converted.webp`.
   - **Delimiter:** `;` ends the first command statement.
   - **Command 2:** `whoami`  
     *Result:* The OS executes the `whoami` binary and returns the current user (e.g., `akshat`).
   - **Comment:** `#` comments out any trailing command syntax.
3. **In-Band Output Capture:**
   The output of `whoami` is captured in `result.stdout` and returned in the HTTP response body:
   ```json
   {
     "mode": "vulnerable",
     "success": true,
     "executed_command": "/usr/bin/convert uploads/dbd0007f6f3a.png converted/converted.webp; whoami #",
     "return_code": 0,
     "stdout": "akshat\n",
     "stderr": "",
     "download_url": "/api/download/converted.webp",
     "output_filename": "converted.webp"
   }
   ```
4. **UI Terminal Panel:** Displays `[STDOUT]: akshat`, demonstrating in-band OS command execution. The converted image is simultaneously available for download.

---

## 8. How the Secure Implementation Mitigates the Vulnerability

In `backend/secure.py`, the vulnerability is resolved at the architectural level using **Argument-Vector Execution with `shell=False`**:

```python
# Parameterized argument vector (list of strings)
command_args = [executable, str(input_path), str(output_target)]

# Direct kernel invocation without a shell
result = subprocess.run(
    command_args,
    shell=False,
    capture_output=True,
    text=True,
    timeout=10,
)
```

### Why this stops the attack:

1. **Direct System Call:** With `shell=False`, Python does not spawn `/bin/sh`. It calls the Linux kernel's `execve()` system call directly.
2. **Fixed Arguments:** The operating system passes each element in the `command_args` list as an isolated pointer in the `argv[]` array of the new process.
3. **Literal Evaluation:** The string `"converted.webp; whoami #"` is passed in its entirety as a single argument (`argv[2]`) to the `convert` binary. The characters `;` and `#` have no special meaning to the ImageMagick binary and are treated as literal characters of the filename.
4. **Injected Command Never Executes:** The `whoami` command is never executed as a binary. Standard output remains empty (`stdout = ""`), and no unauthorized system commands run.

---

## 9. Comprehensive Defense-in-Depth Mitigations

While argument-vector execution is the primary defense against command injection, production security requires **defense-in-depth**:

| Mitigation Technique | Description | Implementation Example |
| :--- | :--- | :--- |
| **1. Avoid Shell Invocation** | Never pass `shell=True` in Python subprocess calls when dealing with external input. | `subprocess.run([...], shell=False)` |
| **2. Argument-Vector Execution** | Structure commands as discrete lists/tuples (`argv` arrays). | `["convert", input_file, output_file]` |
| **3. Strict Allow-List Validation** | Validate filenames against a strict regular expression permitting only alphanumeric characters, underscores, hyphens, and approved extensions. | `re.match(r"^[a-zA-Z0-9_\-]+\.(png\|jpg\|jpeg\|webp)$", filename)` |
| **4. Path Traversal Prevention** | Forbid path separators (`/`, `\`) and directory traversal sequences (`..`), resolving files within dedicated sandboxed directories. | Check for `/` and `..` before joining paths |
| **5. Least-Privilege Execution** | Run application workers under an unprivileged system user with restricted shell access (`nologin`) and read/write access limited to temporary directories. | Dedicated system user (e.g., `www-data` or `convertly-runner`) |
| **6. Execution Timeouts** | Always enforce hard process timeouts on external CLI subprocesses to prevent Denial of Service (DoS). | `subprocess.run(..., timeout=10)` |

---
