// Date utilities
export const formatDate = (date: string | Date): string => {
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  
  // Handle string dates - check if it's in YYYY-MM-DD format
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    return dateObj.toLocaleDateString();
  }
  
  // Fallback for other date formats
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString();
};

export const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidAge = (age: number): boolean => {
  return age >= 18 && age <= 120;
};

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups: Record<string, T[]>, item: T) => {
    const groupKey = String(item[key]);
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {});
};

// Constants
export const INCOME_BRACKETS = [
  'Under $25,000',
  '$25,000 - $49,999',
  '$50,000 - $74,999',
  '$75,000 - $99,999',
  '$100,000 - $149,999',
  '$150,000 - $199,999',
  '$200,000 or more'
] as const;

export const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'LLC',
  'S-Corporation',
  'C-Corporation',
  'Non-Profit',
  'Other'
] as const;

export const EMPLOYEE_COUNT_RANGES = [
  '1-5',
  '6-10',
  '11-25',
  '26-50',
  '51-100',
  '101-500',
  '500+'
] as const; 