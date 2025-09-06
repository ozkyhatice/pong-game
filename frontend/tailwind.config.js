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
        'neon': '#39FF14',
        'neon-green': '#39FF14',
        'neon-glow': 'rgba(57,255,20,0.25)',
        'neon-blue': '#62A6FA',
        'neon-red': '#F07171',
        'neon-white': '#DDF6F8',
		'neon-yellow': '#FACD1E',
		'neon-purple': '#c187fc',
        'terminal-bg': '#0A0A0A',
        'terminal-border': '#1A1A1A',
        'console-bg': '#111111',
        'landing-bg-start': '#010912',
        'landing-bg-end': '#041025',
      },
      animation: {
        'pulse': 'pulse 2s infinite',
        'caret-blink': 'caret-blink 1s step-end infinite',
      },
      boxShadow: {
        'terminal': '0 0 20px rgba(57,255,20,0.3), inset 0 0 20px rgba(0,0,0,0.8)',
        'input-glow': '0 0 10px rgba(57,255,20,0.3), inset 0 0 10px rgba(0,0,0,0.5)',
        'btn-glow': '0 0 15px rgba(57,255,20,0.4)',
        'btn-blue-glow': '0 0 15px rgba(98,166,250,0.4)',
        'dot-glow': '0 0 4px #39FF14',
        'text-glow': '0 0 5px #39FF14',
        'text-blue-glow': '0 0 10px #62A6FA',
        'neon-btn': '0 6px 24px rgba(0,0,0,0.6), 0 0 18px rgba(57,255,20,0.25)',
        'neon-divider': '0 0 8px rgba(57,255,20,0.25)',
      },
      backgroundImage: {
        'header-gradient': 'linear-gradient(90deg, #1a1a1a, #2a2a2a)',
        'btn-gradient': 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
        'btn-gradient-hover': 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
        'divider-gradient': 'linear-gradient(90deg, transparent, #39FF14, transparent)',
        'radial-bg': 'radial-gradient(circle, black 0%, #2a2a2a 100%)',
		'radial-bg-green': 'radial-gradient(circle, #39FF14 0%, #2a2a2a 100%)',
        'landing-radial': 'radial-gradient(ellipse at center, #010912 0%, #041025 60%)',
      }
    },
  },
  plugins: [
    function({ addComponents, addUtilities }) {
      addUtilities({
        '@keyframes caret-blink': {
          '50%': { 'border-color': 'transparent' }
        }
      });
      
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
        },
        '.landing-title': {
          display: 'inline-block',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          lineHeight: '0.9',
          fontWeight: '900',
          textShadow: '0 0 6px #39FF14, 0 0 18px rgba(57,255,20,0.25), 0 6px 30px rgba(0,0,0,0.6)',
          WebkitTextStroke: '0.5px rgba(0,0,0,0.35)',
          margin: '0 auto',
        },
        '.typing-text': {
          display: 'inline-block',
          whiteSpace: 'nowrap',
          paddingRight: '12px',
          borderRight: '4px solid #39FF14',
          boxSizing: 'content-box',
          animation: 'caret-blink 1s step-end infinite',
        },
        '.neon-btn': {
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(57,255,20,0.12)',
          color: '#39FF14 !important',
          boxShadow: '0 6px 24px rgba(0,0,0,0.6), 0 0 18px rgba(57,255,20,0.25)',
          backdropFilter: 'blur(6px)',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-3px) scale(1.05)',
          }
        },
        '.or-divider': {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          color: '#39FF14',
          opacity: '0.7',
          '&::before, &::after': {
            content: '""',
            width: '40px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #39FF14, transparent)',
            boxShadow: '0 0 8px rgba(57,255,20,0.25)',
          }
        },
        '.landing-page': {
          height: '100%',
          margin: '0',
          background: 'radial-gradient(ellipse at center, #010912 0%, #041025 60%)',
          color: '#39FF14',
        },
        '.landing-ui': {
          transition: 'opacity 300ms ease, filter 300ms ease',
          '&.fade-out': {
            opacity: '0',
            filter: 'blur(2px)',
            pointerEvents: 'none',
          }
        }
      })
    }
  ],
}
