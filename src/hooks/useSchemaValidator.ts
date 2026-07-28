import type { ColumnType, ColumnMeta } from '../types/schema.types';
import { validateEmail } from '../utils/formatters';

export interface ValidationError {
  columnIndex: number;
  columnLabel: string;
  rowIndex: number;
  message: string;
  value: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateCell(
  value: unknown,
  meta: ColumnMeta,
  rowIndex: number,
): ValidationError | null {
  const colIdx = meta.sheetColumnIndex;
  const makeError = (msg: string): ValidationError => ({
    columnIndex: colIdx,
    columnLabel: meta.label,
    rowIndex,
    message: msg,
    value,
  });

  const strVal = String(value ?? '').trim();

  if (meta.required && (!value || strVal === '')) {
    return makeError(`"${meta.label}" is required`);
  }

  if (!value || strVal === '') return null;

  switch (meta.type) {
    case 'Text':
      return null;

    case 'Number': {
      const num = Number(strVal);
      if (isNaN(num)) return makeError(`"${meta.label}" must be a valid number`);
      return null;
    }

    case 'Date': {
      const d = new Date(strVal + 'T00:00:00');
      if (isNaN(d.getTime())) return makeError(`"${meta.label}" must be a valid date (YYYY-MM-DD)`);
      return null;
    }

    case 'Email': {
      if (!validateEmail(strVal)) return makeError(`"${meta.label}" must be a valid email`);
      return null;
    }

    case 'Currency': {
      const cleaned = strVal.replace(/[^\d.,\-]/g, '').replace(',', '.');
      if (isNaN(Number(cleaned))) return makeError(`"${meta.label}" must be a valid currency value`);
      return null;
    }

    case 'Percentage': {
      const cleaned = strVal.replace('%', '').trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) return makeError(`"${meta.label}" must be a valid percentage`);
      if (meta.decimalPlaces !== undefined && num < 0) return makeError(`"${meta.label}" must be non-negative`);
      return null;
    }

    case 'Barcode':
    case 'QRCode':
      if (strVal.length < 1) return makeError(`"${meta.label}" must not be empty`);
      return null;

    case 'List':
      if (meta.options && meta.options.length > 0) {
        if (!meta.options.includes(strVal)) {
          return makeError(`"${meta.label}" must be one of: ${meta.options.join(', ')}`);
        }
      }
      return null;

    case 'Checkbox':
      if (!['TRUE', 'FALSE', 'true', 'false', '1', '0', 'yes', 'no'].includes(strVal.toLowerCase())) {
        return makeError(`"${meta.label}" must be TRUE or FALSE`);
      }
      return null;

    case 'Color': {
      const hexRe = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
      if (!hexRe.test(strVal)) return makeError(`"${meta.label}" must be a valid HEX color`);
      return null;
    }

    case 'Location': {
      if (strVal.length < 1) return makeError(`"${meta.label}" must not be empty`);
      return null;
    }

    case 'Attachment':
      return null;

    default:
      return null;
  }
}

export function validateRow(
  values: Record<string, unknown>,
  columns: ColumnMeta[],
  rowIndex: number,
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const column of columns) {
    const value = values[column.label];
    const error = validateCell(value, column, rowIndex);
    if (error) errors.push(error);
  }

  return { valid: errors.length === 0, errors };
}

export function validateColumnType(type: string): type is ColumnType {
  return [
    'Text', 'Number', 'Date', 'Barcode', 'QRCode', 'List',
    'Checkbox', 'Email', 'Attachment', 'Location', 'Color',
    'Currency', 'Percentage',
  ].includes(type);
}
