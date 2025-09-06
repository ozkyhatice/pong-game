/**
 * Simple XSS Protection Service
 */
export class XSSProtection {
  // Basic HTML entities
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };

  /**
   * Escape HTML characters
   */
  static escapeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input.replace(/[&<>"']/g, (char) => {
      return this.HTML_ENTITIES[char] || char;
    });
  }

  /**
   * Remove script tags and dangerous content
   */
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Safe innerHTML setter
   */
  static safeInnerHTML(element: Element, content: string): void {
    if (!element || typeof content !== 'string') return;
    
    const sanitized = this.sanitizeHTML(content);
    element.innerHTML = sanitized;
  }

  /**
   * Safe text content setter
   */
  static safeTextContent(element: Element, content: string): void {
    if (!element || typeof content !== 'string') return;
    
    element.textContent = content;
  }

  /**
   * Clean user input
   */
  static cleanInput(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';
    
    return this.escapeHTML(input.trim().substring(0, maxLength));
  }

  /**
   * Sanitize JSON data recursively
   */
  static sanitizeJSON(data: any): any {
    if (typeof data === 'string') {
      return this.escapeHTML(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJSON(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[this.escapeHTML(key)] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return data;
  }
}

// Simple utility functions
export const safeDOM = {
  setHTML: (element: Element, html: string) => XSSProtection.safeInnerHTML(element, html),
  setText: (element: Element, text: string) => XSSProtection.safeTextContent(element, text),
  cleanInput: (input: string) => XSSProtection.cleanInput(input)
};
