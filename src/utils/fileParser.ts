import * as XLSX from 'xlsx';

export interface ParsedWorkbook {
  sheetNames: string[];
  sheets: Record<string, any[]>;
  filename: string;
  sizeBytes: number;
}

/**
 * Reads a File (.xlsx, .xls, .csv) into workbook sheet records.
 */
export async function parseFile(file: File): Promise<ParsedWorkbook> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
    throw new Error('Unsupported format. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
  }

  const arrayBuffer = await file.arrayBuffer();
  
  if (arrayBuffer.byteLength === 0) {
    throw new Error('The uploaded file is empty (0 bytes).');
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      dateNF: 'yyyy-mm-dd',
      raw: false,
    });
  } catch (err: any) {
    throw new Error(`Failed to parse workbook: ${err.message || 'Corrupted or password-protected file.'}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No sheets found in the uploaded workbook.');
  }

  const sheets: Record<string, any[]> = {};
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    
    // Parse to JSON with header row
    const jsonRecords = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: null,
      raw: false,
      blankrows: false,
    });

    if (jsonRecords.length > 0) {
      sheets[sheetName] = jsonRecords;
    }
  }

  const validSheetNames = Object.keys(sheets);
  if (validSheetNames.length === 0) {
    throw new Error('All sheets in the file appear to be empty or contain no data rows.');
  }

  return {
    sheetNames: validSheetNames,
    sheets,
    filename: file.name,
    sizeBytes: file.size,
  };
}

/**
 * Parses raw CSV string directly
 */
export function parseCsvText(csvText: string, filename = 'data.csv'): ParsedWorkbook {
  if (!csvText || csvText.trim().length === 0) {
    throw new Error('CSV text is empty.');
  }

  const workbook = XLSX.read(csvText, {
    type: 'string',
    cellDates: true,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[sheetName];
  const jsonRecords = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: null,
    raw: false,
    blankrows: false,
  });

  return {
    sheetNames: [sheetName],
    sheets: { [sheetName]: jsonRecords },
    filename,
    sizeBytes: new Blob([csvText]).size,
  };
}
