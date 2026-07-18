module.exports = {
  content: [
    "./src/templates/**/*.html",
    "./src/frontend/**/*.{ts,tsx}",
    "./src/main.py"
  ],
  darkMode: 'class',
  theme: {
    // shadcn token colors used by transplanted v1 components (fixed mapping
    // onto the devnet dark palette — v1 pages render true-to-life)
    
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#fafafa",
        border: "rgba(255,255,255,0.1)",
        input: "rgba(255,255,255,0.08)",
        ring: "#22d3ee",
        primary: { DEFAULT: "#10b981", foreground: "#052e22" },
        secondary: { DEFAULT: "#27272a", foreground: "#e4e4e7" },
        muted: { DEFAULT: "#18181b", foreground: "#a1a1aa" },
        accent: { DEFAULT: "#1f2937", foreground: "#e5e7eb" },
        destructive: { DEFAULT: "#ef4444", foreground: "#fff" },
        card: { DEFAULT: "#111113", foreground: "#fafafa" },
        popover: { DEFAULT: "#111113", foreground: "#fafafa" },
      },
      colors: {
        'background': '#09090b',
        'foreground': '#fafafa',
        'card': '#0c0c0e',
        'card-foreground': '#fafafa',
        'popover': '#09090b',
        'popover-foreground': '#fafafa',
        'primary': '#10b981',
        'primary-foreground': '#022c22',
        'secondary': '#27272a',
        'secondary-foreground': '#fafafa',
        'muted': '#27272a',
        'muted-foreground': '#a1a1aa',
        'accent': '#27272a',
        'accent-foreground': '#fafafa',
        'destructive': '#ef4444',
        'destructive-foreground': '#fafafa',
        'border': '#27272a',
        'input': '#27272a',
        'ring': '#10b981',
        'zinc': {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        'emerald': {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        'green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        'purple': {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        'cyan': {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        'amber': {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        'rose': {
          400: '#fb7185',
          500: '#f43f5e',
        },
        'orange': {
          400: '#fb923c',
          500: '#f97316',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-lg': '0 0 40px rgba(16, 185, 129, 0.2)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.4)',
        'elevated': '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'gradient': 'gradient 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
