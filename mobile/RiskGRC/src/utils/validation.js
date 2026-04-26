/**
 * Input Validation Utilities
 * Provides secure input validation functions
 */

import CONFIG from '../constants/config';

// Validate Username
export const validateUsername = (username) => {
  if (!username || !username.trim()) {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  const { MIN_LENGTH, MAX_LENGTH } = CONFIG.VALIDATION.USERNAME;

  if (trimmed.length < MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must not exceed ${MAX_LENGTH} characters`,
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error:
        'Username can only contain letters, numbers, underscore, and hyphen',
    };
  }

  return { valid: true, error: null };
};

// Validate Password
export const validatePassword = (password, isStrict = false) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  const minLength = isStrict
    ? CONFIG.VALIDATION.PASSWORD.MIN_LENGTH
    : CONFIG.VALIDATION.PASSWORD.CLIENT_MIN_LENGTH;

  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters`,
    };
  }

  if (password.length > CONFIG.VALIDATION.PASSWORD.MAX_LENGTH) {
    return {
      valid: false,
      error: `Password must not exceed ${CONFIG.VALIDATION.PASSWORD.MAX_LENGTH} characters`,
    };
  }

  if (isStrict) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    if (!hasUpperCase) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter',
      };
    }

    if (!hasLowerCase) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter',
      };
    }

    if (!hasNumbers) {
      return {
        valid: false,
        error: 'Password must contain at least one number',
      };
    }

    if (!hasSpecialChar) {
      return {
        valid: false,
        error: 'Password must contain at least one special character',
      };
    }
  }

  return { valid: true, error: null };
};

// Validate Email
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email is required' };
  }

  if (!CONFIG.VALIDATION.EMAIL.PATTERN.test(email.trim())) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true, error: null };
};

// Sanitize Input (basic XSS protection)
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[<>"'&]/g, (char) => {
      const map = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return map[char] || char;
    });
};

// Validate Multiple Fields
export const validateFields = (fields, rules) => {
  const errors = {};

  rules.forEach((rule) => {
    const { field, validator } = rule;

    if (fields.hasOwnProperty(field)) {
      const result = validator(fields[field]);

      if (!result.valid) {
        errors[field] = result.error;
      }
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
