// Parser + validasi CSV upload user - cermin aturan di architecture_proposal_v0.2.md
// ("Format File CSV untuk Upload User") dan backend/app/services/csv_service.py, supaya pesan
// error yang dilihat admin di mockup konsisten dengan yang nanti benar-benar dikembalikan backend.
import { normalizeKartu } from "./kartu";

const EXPECTED_HEADER = ["kartu", "nama", "department", "doors"];

export interface CsvRowError {
  row: number; // nomor baris fisik (baris 1 = header, baris 2 = data pertama)
  kartu: string;
  reason: string;
}

export interface CsvValidUser {
  kartu: string;
  nama: string;
  departmentId: number | null;
  isCustomAccess: boolean;
  doorIds: number[];
}

export interface CsvValidationResult {
  validUsers: CsvValidUser[];
  errors: CsvRowError[];
}

export interface CsvFileError {
  fileError: string;
}

// Parser baris CSV dasar (RFC4180): mendukung field berkutip dengan koma/quote di dalamnya.
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function validateUserCsv(
  content: string,
  departments: { id: number; nama: string }[],
  doors: { id: number; nama: string }[],
): CsvValidationResult | CsvFileError {
  const lines = content.split(/\r\n|\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { fileError: "File CSV kosong" };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const headerValid =
    header.length === EXPECTED_HEADER.length &&
    EXPECTED_HEADER.every((expected, i) => expected === header[i]);
  if (!headerValid) {
    return {
      fileError: `Header CSV harus persis 'kartu,nama,department,doors', ditemukan: '${header.join(",")}'`,
    };
  }

  const dataRows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      kartu: cols[0] ?? "",
      nama: cols[1] ?? "",
      department: cols[2] ?? "",
      doors: cols[3] ?? "",
    };
  });

  // nama mengandung koma -> tolak SELURUH file (dicek dulu, sebelum baris manapun diproses)
  for (let i = 0; i < dataRows.length; i++) {
    const nama = (dataRows[i].nama ?? "").trim();
    if (nama.includes(",")) {
      return {
        fileError: `Baris ${i + 2}: kolom nama mengandung koma ('${nama}') — seluruh file ditolak`,
      };
    }
  }

  const departmentsByName = new Map(departments.map((d) => [d.nama, d]));
  const doorsByName = new Map(doors.map((d) => [d.nama, d]));

  const errors: CsvRowError[] = [];
  const validUsers: CsvValidUser[] = [];
  const seenInFile = new Set<string>();

  dataRows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const kartu = normalizeKartu(row.kartu ?? "");
    const nama = (row.nama ?? "").trim();
    const departmentNama = (row.department ?? "").trim();
    const doorsRaw = (row.doors ?? "").trim();

    if (!kartu) {
      errors.push({ row: rowNumber, kartu, reason: "kartu kosong" });
      return;
    }
    if (!nama) {
      errors.push({ row: rowNumber, kartu, reason: "nama kosong" });
      return;
    }
    if (seenInFile.has(kartu)) {
      errors.push({ row: rowNumber, kartu, reason: "kartu duplikat dalam file" });
      return;
    }

    let departmentId: number | null = null;
    if (departmentNama) {
      const dept = departmentsByName.get(departmentNama);
      if (!dept) {
        errors.push({
          row: rowNumber,
          kartu,
          reason: `department '${departmentNama}' tidak ditemukan`,
        });
        return;
      }
      departmentId = dept.id;
    }

    let doorIds: number[] = [];
    if (doorsRaw) {
      const doorNames = doorsRaw
        .split("|")
        .map((name) => name.trim())
        .filter(Boolean);
      const missing = doorNames.filter((name) => !doorsByName.has(name));
      if (missing.length > 0) {
        errors.push({
          row: rowNumber,
          kartu,
          reason: `nama pintu tidak ditemukan: ${missing.join(", ")}`,
        });
        return;
      }
      doorIds = doorNames.map((name) => doorsByName.get(name)!.id);
    }

    seenInFile.add(kartu);
    validUsers.push({ kartu, nama, departmentId, isCustomAccess: doorIds.length > 0, doorIds });
  });

  return { validUsers, errors };
}
