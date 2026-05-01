import fs from "fs/promises";
import mammoth from "mammoth";
import pdf from "pdf-parse";

export async function extractCvText(file) {
  if (!file) {
    return "";
  }

  const buffer = await fs.readFile(file.path);
  const name = file.originalname.toLowerCase();
  const type = file.mimetype;

  if (name.endsWith(".pdf") || type === "application/pdf") {
    const parsed = await pdf(buffer);
    return parsed.text;
  }

  if (
    name.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }

  return buffer.toString("utf8");
}
