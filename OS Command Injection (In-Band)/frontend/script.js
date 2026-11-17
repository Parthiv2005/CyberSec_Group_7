// Convertly Frontend Client

document.addEventListener("DOMContentLoaded", () => {
  let selectedFile = null;

  // DOM Elements
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const previewContainer = document.getElementById("preview-container");
  const imagePreview = document.getElementById("image-preview");
  const previewFilename = document.getElementById("preview-filename");
  const previewFilesize = document.getElementById("preview-filesize");
  const removeFileBtn = document.getElementById("remove-file-btn");

  const outputFilenameInput = document.getElementById("output-filename");
  const presetChips = document.querySelectorAll(".payload-chip");
  const btnConvert = document.getElementById("btn-convert");

  const statusCard = document.getElementById("status-card");
  const statusText = document.getElementById("status-text");

  const downloadWrapper = document.getElementById("download-wrapper");
  const downloadBtn = document.getElementById("download-btn");
  const downloadFilenameLabel = document.getElementById("download-filename-label");

  const detailsAccordion = document.getElementById("details-accordion");
  const detailsBadge = document.getElementById("details-output-badge");
  const diagCommand = document.getElementById("diag-command");
  const diagStatus = document.getElementById("diag-status");
  const diagStdout = document.getElementById("diag-stdout");
  const diagStderr = document.getElementById("diag-stderr");

  // File selection
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-active");
  });

  ["dragleave", "dragend"].forEach((type) => {
    dropZone.addEventListener(type, () => dropZone.classList.remove("drag-active"));
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-active");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetFile();
  });

  function handleFile(file) {
    selectedFile = file;
    previewFilename.textContent = file.name;
    previewFilesize.textContent = `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      previewContainer.classList.remove("hidden");
      dropZone.classList.add("hidden");
    };
    reader.readAsDataURL(file);

    updateStatus("idle", `Selected file: ${file.name}`);
  }

  function resetFile() {
    selectedFile = null;
    fileInput.value = "";
    previewContainer.classList.add("hidden");
    dropZone.classList.remove("hidden");
    downloadWrapper.classList.add("hidden");
    detailsAccordion.classList.add("hidden");
    updateStatus("idle", "Ready. Choose an image and click Convert Image.");
  }

  // Preset chips
  presetChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      outputFilenameInput.value = chip.dataset.preset;
      outputFilenameInput.focus();
    });
  });

  // Convert button action
  btnConvert.addEventListener("click", async () => {
    if (!selectedFile) {
      updateStatus("error", "Please upload an image first.");
      return;
    }

    const outputName = outputFilenameInput.value.trim();
    if (!outputName) {
      updateStatus("error", "Please enter an output filename.");
      return;
    }

    btnConvert.disabled = true;
    updateStatus("processing", "Processing image conversion...");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("output_filename", outputName);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Server returned ${response.status}`);
      }

      // Display download button if file ready
      if (data.download_url) {
        downloadBtn.href = data.download_url;
        downloadFilenameLabel.textContent = data.output_filename || "image";
        downloadWrapper.classList.remove("hidden");
      } else {
        downloadWrapper.classList.add("hidden");
      }

      // Populate diagnostics accordion
      diagCommand.textContent = data.executed_command;
      diagStatus.textContent = `Exit Code: ${data.return_code}`;

      const stdoutText = data.stdout ? data.stdout.trim() : "";
      diagStdout.textContent = stdoutText || "(empty)";
      if (stdoutText) {
        diagStdout.classList.add("stdout-injected");
        detailsBadge.classList.remove("hidden");
        detailsAccordion.open = true; // Auto-open to show injected output
      } else {
        diagStdout.classList.remove("stdout-injected");
        detailsBadge.classList.add("hidden");
      }

      const stderrText = data.stderr ? data.stderr.trim() : "";
      diagStderr.textContent = stderrText || "(none)";

      detailsAccordion.classList.remove("hidden");

      if (data.success) {
        updateStatus("success", `Conversion completed successfully! (Exit Code: ${data.return_code})`);
      } else {
        updateStatus("warning", `Process returned non-zero code: ${data.return_code}`);
      }

    } catch (err) {
      updateStatus("error", `Error: ${err.message}`);
    } finally {
      btnConvert.disabled = false;
    }
  });

  function updateStatus(type, message) {
    statusCard.className = `status-card status-${type}`;
    statusText.textContent = message;
  }
});
