import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone number string to (XXX) XXX-XXXX format
 * Strips all non-numeric characters and formats as user types
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters
  const digits = value.replace(/\D/g, '')

  // Limit to 10 digits
  const limited = digits.slice(0, 10)

  // Format based on length
  if (limited.length === 0) return ''
  if (limited.length <= 3) return `(${limited}`
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
}

/**
 * Normalizes a phone number to E.164 format for comparison and Firebase phone auth
 * Strips all non-numeric characters and adds +1 country code if missing
 * @param phone - The phone number in any format
 * @returns The normalized phone number in E.164 format (e.g., +15551234567) or null if invalid
 */
export function normalizePhoneNumber(phone: string | undefined | null): string | null {
  if (!phone) return null;

  // Remove all non-numeric characters except leading +
  let digits = phone.replace(/[^\d+]/g, '');

  // If it starts with +, extract just the digits after
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  }

  // If it's 10 digits, assume US number and add country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits starting with 1, add + prefix
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If it already has country code (11+ digits), add + prefix
  if (digits.length >= 11) {
    return `+${digits}`;
  }

  // Invalid phone number
  return null;
}

/**
 * Fixes a URL by adding https:// if no protocol is present
 */
export function fixUrl(value: string): string {
  if (!value || value.trim() === '') return value

  const trimmed = value.trim()

  // Check if URL already has a protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  // Check if URL starts with // (protocol-relative)
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  // Add https:// prefix
  return `https://${trimmed}`
}
