/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.html",
    "./pages/**/*.ts",
    "./index.html",
    "./main.ts"
  ],
  theme: {
    extend: {
      fontFamily: {
        'orbitron': ['Orbitron', 'system-ui', 'sans-serif'],
      },
      colors: {
        'neon-green': '#39FF14',
        'neon-glow': 'rgba(57,255,20,0.25)',
        'neon-blue': '#62A6FA',
        'neon-red': '#F07171',
        'neon-white': '#DDf6f8',
        'terminal-bg': '#0A0A0A',
        'terminal-border': '#1A1A1A',
        'console-bg': '#111111',
      },
      animation: {
        'pulse': 'pulse 2s infinite',
      },
      boxShadow: {
        'terminal': '0 0 20px rgba(57,255,20,0.3), inset 0 0 20px rgba(0,0,0,0.8)',
        'input-glow': '0 0 10px rgba(57,255,20,0.3), inset 0 0 10px rgba(0,0,0,0.5)',
        'btn-glow': '0 0 15px rgba(57,255,20,0.4)',
        'btn-blue-glow': '0 0 15px rgba(98,166,250,0.4)',
        'dot-glow': '0 0 4px #39FF14',
        'text-glow': '0 0 5px #39FF14',
        'text-blue-glow': '0 0 10px #62A6FA',
      },
      backgroundImage: {
        'header-gradient': 'linear-gradient(90deg, #1a1a1a, #2a2a2a)',
        'btn-gradient': 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
        'btn-gradient-hover': 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
        'divider-gradient': 'linear-gradient(90deg, transparent, #39FF14, transparent)',
      }
    },
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.status-dot': {
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          backgroundColor: '#39FF14',
          boxShadow: '0 0 4px #39FF14',
          animation: 'pulse 2s infinite',
        },
        '.terminal-input': {
          transition: 'all 0.3s ease',
          '&:focus': {
            borderColor: '#39FF14',
            boxShadow: '0 0 10px rgba(57,255,20,0.3), inset 0 0 10px rgba(0,0,0,0.5)',
            backgroundColor: 'rgba(0,0,0,0.9)',
          },
          '&::placeholder': {
            color: 'rgba(57,255,20,0.5)',
            textTransform: 'uppercase',
          }
        },
        '.terminal-btn': {
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundImage: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
            boxShadow: '0 0 15px rgba(57,255,20,0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          }
        },
        '.btn-secondary:hover': {
          boxShadow: '0 0 15px rgba(98,166,250,0.4)',
        },
        '.nav-btn': {
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#39FF14',
            color: '#39FF14',
            backgroundColor: 'rgba(0,0,0,0.8)',
          }
        }
      })
    }
  ],
}
