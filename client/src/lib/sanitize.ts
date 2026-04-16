import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML from the rich-text editor before rendering with dangerouslySetInnerHTML.
 * Strips all scripts, event handlers, and dangerous attributes while preserving
 * safe formatting tags (p, b, i, ul, ol, li, br, strong, em, etc.).
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p',
      'b',
      'i',
      'em',
      'strong',
      'ul',
      'ol',
      'li',
      'br',
      'span',
      'u',
      'h1',
      'h2',
      'h3',
      'blockquote',
    ],
    ALLOWED_ATTR: ['class'],
  });
}
