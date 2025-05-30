import path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";

/**
 * Escapes all characters in a string, including newlines and special symbols.
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

/**
 * Detects file type by extension and extracts raw text accordingly.
 * Accepts file buffer instead of file path.
 */
async function extractTextFromBuffer(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case ".pdf": {
      const data = await pdf(buffer);
      return data.text || "";
    }

    case ".docx":
    case ".doc": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    case ".txt": {
      return buffer.toString("utf-8");
    }

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Main function: extract from buffer, escape, and return string
 */
export async function convertBufferToEscapedText(
  fileBuffer: Buffer,
  originalName: string
): Promise<string> {
  try {
    // Check file size (10MB = 10 * 1024 * 1024 bytes)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum limit of 10MB. Current size: ${(
          fileBuffer.length /
          (1024 * 1024)
        ).toFixed(2)}MB`
      );
    }

    const rawText = await extractTextFromBuffer(fileBuffer, originalName);
    const escapedText = escapeString(rawText);
    return escapedText;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
