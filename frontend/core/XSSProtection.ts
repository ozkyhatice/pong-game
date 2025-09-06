
export class XSSProtection {
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };

  static escapeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input.replace(/[&<>"']/g, (char) => {
      return this.HTML_ENTITIES[char] || char;
    });
  }

  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }


  static safeInnerHTML(element: Element, content: string): void {
    if (!element || typeof content !== 'string') return;
    
    const sanitized = this.sanitizeHTML(content);
    element.innerHTML = sanitized;
  }


  static safeTextContent(element: Element, content: string): void {
    if (!element || typeof content !== 'string') return;
    
    element.textContent = content;
  }

  static cleanInput(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';
    
    return this.escapeHTML(input.trim().substring(0, maxLength));
  }

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


  static safeAppendChild(parent: Element, child: Element | HTMLCanvasElement): void {
    if (!parent || !child) return;

    const dangerousElements = ['script', 'object', 'embed', 'iframe'];
    
    if (dangerousElements.includes(child.tagName.toLowerCase())) {
      console.warn('Blocked attempt to inject potentially dangerous element:', child.tagName);
      return;
    }

    Array.from(child.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        child.removeAttribute(attr.name);
      }
    });

    if (child instanceof HTMLAnchorElement) {
      const href = child.getAttribute('href');
      if (href && href.toLowerCase().includes('javascript:')) {
        child.removeAttribute('href');
      }
    }

    Node.prototype.appendChild.call(parent, child);
  }
}

export const safeDOM = {
  setHTML: (element: Element, html: string) => XSSProtection.safeInnerHTML(element, html),
  setText: (element: Element, text: string) => XSSProtection.safeTextContent(element, text),
  cleanInput: (input: string) => XSSProtection.cleanInput(input),
  appendChild: (parent: Element, child: Element | HTMLCanvasElement) => XSSProtection.safeAppendChild(parent, child)
};
