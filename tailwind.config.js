/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1890ff',
        'primary-hover': '#40a9ff',
        'primary-bg': '#e6f7ff',
        success: '#52c41a',
        danger: '#ff4d4f',
        warning: '#faad14',
        border: '#e5e7eb',
        divider: '#f0f0f0',
        'bg-page': '#F0F1F3',
        'bg-card': '#FFFFFF',
        'text-title': '#1a1a1a',
        'text-body': '#374151',
        'text-muted': '#9CA3AF',
        'text-disabled': '#d9d9d9',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'system-ui', '-apple-system', 'sans-serif'],
        blazed: ['Arial Black', 'Impact', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        logo: ['var(--font-caveat)', 'cursive'],
      },
      fontSize: {
        'heading-lg': ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'heading': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'heading-sm': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.6' }],
        'caption': ['12px', { lineHeight: '1.5' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'dropdown': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'card': '8px',
        'btn': '6px',
        'tag': '4px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};
