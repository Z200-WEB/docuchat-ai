import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with conflict resolution.
  * Uses clsx for conditional classes and tailwind-merge for deduplication.
   */
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
     }

     /**
      * Formats a file size in bytes to a human-readable string.
       */
       export function formatFileSize(bytes: number): string {
         if (bytes === 0) return '0 B';
           const k = 1024;
             const sizes = ['B', 'KB', 'MB', 'GB'];
               const i = Math.floor(Math.log(bytes) / Math.log(k));
                 return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
                 }

                 /**
                  * Truncates a string to a maximum length with ellipsis.
                   */
                   export function truncate(str: string, maxLength: number): string {
                     if (str.length <= maxLength) return str;
                       return str.slice(0, maxLength - 3) + '...';
                       }

                       /**
                        * Generates a random UUID-like string for client-side use.
                         */
                         export function generateId(): string {
                           return crypto.randomUUID();
                           }
