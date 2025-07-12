// Password validation utility
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

// List of common weak passwords to prevent
const COMMON_WEAK_PASSWORDS = [
  'password',
  'password123',
  'admin',
  'admin123',
  'qwerty',
  'qwerty123',
  'abc123',
  'password1',
  'admin1',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'password!',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '987654321',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'qazwsx',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'welcome123',
  'password@123',
  'admin@123',
  'user123',
  'test123',
  'guest',
  'guest123',
  'root',
  'root123',
  'passw0rd',
  'p@ssw0rd',
  'p@ssword',
  'password@',
  'password#',
  'password$',
  'password%',
  'password&',
  'password*',
  'password+',
  'password-',
  'password=',
  'password_',
  'password.',
  'password/',
  'password?',
  'password!'
];

// List of common patterns to avoid
const WEAK_PATTERNS = [
  /^(.)\1{7,}$/, // Same character repeated (8+ times)
  /^(012|123|234|345|456|567|678|789|890|901){2,}/, // Sequential numbers
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz){2,}/i, // Sequential letters
  /^(qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm){2,}/i, // Keyboard patterns
];

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Check for common weak passwords
  if (COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common and easily guessable');
  }
  
  // Check for weak patterns
  for (const pattern of WEAK_PATTERNS) {
    if (pattern.test(password)) {
      errors.push('Password contains predictable patterns');
      break;
    }
  }
  
  // Check for basic character requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  // Count character types
  const charTypeCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length;
  
  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (password.length >= 8 && charTypeCount >= 2 && errors.length === 0) {
    if (password.length >= 12 && charTypeCount >= 3) {
      strength = 'strong';
    } else {
      strength = 'medium';
    }
  }
  
  // Add suggestions for improvement
  if (password.length >= 8 && errors.length === 0) {
    if (charTypeCount < 2) {
      errors.push('Password should include a mix of uppercase, lowercase, numbers, or special characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'strong':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
}

export function getPasswordStrengthText(strength: 'weak' | 'medium' | 'strong'): string {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'medium':
      return 'Medium';
    case 'strong':
      return 'Strong';
    default:
      return 'Unknown';
  }
} 