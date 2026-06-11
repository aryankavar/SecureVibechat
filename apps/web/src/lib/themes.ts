export const CHAT_THEMES: Record<string, { name: string; sentBg: string; sentBorder: string }> = {
  default: {
    name: 'Default Blue',
    sentBg: 'rgba(10, 132, 255, 0.15)',
    sentBorder: 'rgba(10, 132, 255, 0.3)',
  },
  sunset: {
    name: 'Sunset Orange',
    sentBg: 'rgba(255, 149, 0, 0.15)',
    sentBorder: 'rgba(255, 149, 0, 0.3)',
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    sentBg: 'rgba(255, 42, 149, 0.15)',
    sentBorder: 'rgba(255, 42, 149, 0.3)',
  },
  emerald: {
    name: 'Emerald Green',
    sentBg: 'rgba(40, 205, 65, 0.15)',
    sentBorder: 'rgba(40, 205, 65, 0.3)',
  },
  lavender: {
    name: 'Lavender Purple',
    sentBg: 'rgba(175, 82, 222, 0.15)',
    sentBorder: 'rgba(175, 82, 222, 0.3)',
  }
};
