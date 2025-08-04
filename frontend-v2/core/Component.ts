export interface ComponentOptions {
  className?: string;
  id?: string;
  tag?: string;
}

export class Component {
  protected element: HTMLElement;
  private children: Component[] = [];

  constructor(options: ComponentOptions = {}) {
    this.element = this.createElement(options);
    this.init();
  }

  protected createElement(options: ComponentOptions): HTMLElement {
    const element = document.createElement(options.tag || 'div');
    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    return element;
  }

  protected init(): void {
    // Override in child components
  }

  getElement(): HTMLElement {
    return this.element;
  }

  setHTML(html: string): Component {
    this.element.innerHTML = html;
    return this;
  }

  setText(text: string): Component {
    this.element.textContent = text;
    return this;
  }

  addClass(className: string): Component {
    const classes = className.split(' ').filter(cls => cls.trim() !== '');
    classes.forEach(cls => this.element.classList.add(cls));
    return this;
  }

  removeClass(className: string): Component {
    const classes = className.split(' ').filter(cls => cls.trim() !== '');
    classes.forEach(cls => this.element.classList.remove(cls));
    return this;
  }

  on(event: string, handler: EventListener): Component {
    this.element.addEventListener(event, handler);
    return this;
  }

  append(child: Component | HTMLElement): Component {
    if (child instanceof Component) {
      this.children.push(child);
      this.element.appendChild(child.getElement());
    } else {
      this.element.appendChild(child);
    }
    return this;
  }

  remove(): void {
    this.element.remove();
  }

  destroy(): void {
    this.children.forEach(child => child.destroy());
    this.children = [];
    this.remove();
  }
}