# ft_transcendence Frontend Architecture

A minimal, clean TypeScript + Tailwind CSS Single Page Application (SPA) with client-side routing.

## 🏗️ Architecture Overview

```
src/
├── core/                 # Core framework classes
│   ├── Router.ts        # Client-side routing (URL stays constant)
│   └── Component.ts     # Base component class
├── components/          # Reusable UI components
│   ├── Navigation.ts    # Navigation bar
│   └── ProfileCard.ts   # Example: User profile card
├── pages/              # Page views/screens
│   ├── HomePage.ts     # Home page
│   ├── ProfilePage.ts  # Profile page (uses ProfileCard)
│   └── GamePage.ts     # Game page
├── styles/
│   └── input.css       # Tailwind CSS input
├── main.ts             # Application entry point
└── index.html          # HTML template
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build and run development server
npm run dev

# Build for production
npm run build
```

## 📝 How to Add New Components

### 1. Create a Component

Create `src/components/MyComponent.ts`:

```typescript
import { Component } from '../core/Component.js';

export class MyComponent extends Component {
  constructor(private data: any) {
    super();
  }

  protected createElement(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'bg-gray-800 p-4 rounded';
    element.innerHTML = `
      <h3 class="text-white font-bold">${this.data.title}</h3>
      <button data-action="click-me" class="bg-blue-600 text-white px-4 py-2 rounded mt-2">
        Click Me
      </button>
    `;
    return element;
  }

  protected setupEventListeners(): void {
    const button = this.element.querySelector('[data-action="click-me"]');
    button?.addEventListener('click', () => {
      console.log('Button clicked!');
    });
  }
}
```

### 2. Create a Page

Create `src/pages/MyPage.ts`:

```typescript
import { MyComponent } from '../components/MyComponent.js';

export function createMyPage(): HTMLElement {
  const page = document.createElement('div');
  page.className = 'max-w-4xl mx-auto p-6';
  
  const component = new MyComponent({ title: 'Hello World' });
  page.appendChild(component.getElement());
  
  return page;
}
```

### 3. Register the Route

In `src/main.ts`, add to `setupRoutes()`:

```typescript
private setupRoutes(): void {
  this.router.addRoute('/', createHomePage);
  this.router.addRoute('/profile', createProfilePage);
  this.router.addRoute('/game', createGamePage);
  this.router.addRoute('/my-page', createMyPage); // Add this line
}
```

### 4. Add Navigation Link

In `src/components/Navigation.ts`, add a button:

```html
<button data-route="/my-page" class="nav-link px-4 py-2 rounded hover:bg-gray-700 transition-colors">
  My Page
</button>
```

## 🔄 How Routing Works

- **True SPA**: URL always stays as `/` (no browser URL changes)
- **Client-side only**: Navigation happens via `router.navigate('/path')`
- **No history API**: Pure internal state management
- **Simple**: Just a Map of routes to component functions

## 🎨 Styling Guidelines

- Use Tailwind CSS utility classes
- Dark theme: `bg-gray-900`, `bg-gray-800`, `text-white`
- Interactive elements: `hover:` states and `transition-colors`
- Responsive: Use `md:`, `lg:` prefixes for breakpoints

## 📦 Key Features

- ✅ TypeScript with strict mode
- ✅ Tailwind CSS for styling
- ✅ Component-based architecture
- ✅ Client-side routing (URL constant)
- ✅ Event handling system
- ✅ Clean separation of concerns
- ✅ Easy to extend and modify
- ✅ Single command build (`npm run build`)

## 🔧 Build System

- **TypeScript**: Compiles to ES2020 modules
- **Tailwind**: Processes CSS and minifies
- **Output**: Everything goes to `dist/` folder
- **Development**: `npm run dev` starts local server on port 8080

The architecture is designed to be minimal, understandable, and easily extensible while meeting all your project constraints.
