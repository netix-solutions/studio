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
