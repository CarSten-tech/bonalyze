import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* =======================================================================
         COLORS
         All colors use CSS custom properties from globals.css
         ======================================================================= */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* Semantic Colors */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },

        /* Chart/Category Colors */
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        /* Navigation Colors */
        nav: {
          DEFAULT: "hsl(var(--nav-background))",
          foreground: "hsl(var(--nav-foreground))",
          active: "hsl(var(--nav-active))",
          border: "hsl(var(--nav-border))",
        },

        /* Sidebar */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      /* =======================================================================
         BORDER RADIUS
         ======================================================================= */
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-xl)",
      },

      /* =======================================================================
         SPACING (8pt grid system)
         ======================================================================= */
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "safe-top": "var(--safe-top)",
        "safe-bottom": "var(--safe-bottom)",
        "safe-left": "var(--safe-left)",
        "safe-right": "var(--safe-right)",
        header: "var(--header-height)",
        "bottom-nav": "var(--bottom-nav-height)",
      },

      /* =======================================================================
         TYPOGRAPHY
         ======================================================================= */
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "1.4" }],
        sm: ["var(--text-sm)", { lineHeight: "1.4" }],
        base: ["var(--text-base)", { lineHeight: "1.5" }],
        lg: ["var(--text-lg)", { lineHeight: "1.3" }],
        xl: ["var(--text-xl)", { lineHeight: "1.2" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "1.1" }],
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },

      /* =======================================================================
         MIN HEIGHT (for touch targets)
         ======================================================================= */
      minHeight: {
        touch: "44px",
        header: "var(--header-height)",
        "bottom-nav": "var(--bottom-nav-height)",
      },
      minWidth: {
        touch: "44px",
      },

      /* =======================================================================
         HEIGHT
         ======================================================================= */
      height: {
        header: "var(--header-height)",
        "bottom-nav": "var(--bottom-nav-height)",
      },

      /* =======================================================================
         ANIMATIONS
         ======================================================================= */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-down": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
      },

      /* =======================================================================
         BOX SHADOW (minimal, per design spec)
         Level 1: 0 1px 2px rgba(0,0,0,0.05)
         Level 2: 0 4px 12px rgba(0,0,0,0.08)
         ======================================================================= */
      boxShadow: {
        "elevation-1": "0 1px 2px rgba(0,0,0,0.05)",
        "elevation-2": "0 4px 12px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
