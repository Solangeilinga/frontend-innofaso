export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        popover: 'var(--popover)',
        'popover-foreground': 'var(--popover-foreground)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        'custom': `var(--shadow-offset-x) var(--shadow-offset-y) var(--shadow-blur) var(--shadow-spread) var(--shadow-color)`,
      },
      animation: { 
        'fade-in':'fadeIn .3s ease',
        'slide-up':'slideUp .35s cubic-bezier(.16,1,.3,1)',
        'backdrop-in': 'backdropIn .2s ease-out',
        'backdrop-out': 'backdropOut .2s ease-out',
        'dialog-in': 'dialogIn .3s cubic-bezier(.16,1,.3,1)',
        'dialog-out': 'dialogOut .2s ease-out',
      },
      keyframes: {
        fadeIn:  { from:{opacity:0}, to:{opacity:1} },
        slideUp: { from:{opacity:0,transform:'translateY(16px)'}, to:{opacity:1,transform:'translateY(0)'} },
        backdropIn: { from:{opacity:0}, to:{opacity:1} },
        backdropOut: { from:{opacity:1}, to:{opacity:0} },
        dialogIn: { from:{opacity:0,transform:'translate(-50%, -48%) scale(0.96)'}, to:{opacity:1,transform:'translate(-50%, -50%) scale(1)'} },
        dialogOut: { from:{opacity:1,transform:'translate(-50%, -50%) scale(1)'}, to:{opacity:0,transform:'translate(-50%, -48%) scale(0.96)'} },
      },
    }
  },
  plugins: []
};
