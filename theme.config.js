/** @type {const} */
const themeColors = {
  primary: { light: '#FF6B00', dark: '#FF8C33' },
  background: { light: '#ffffff', dark: '#151718' },
  surface: { light: '#FFF8F0', dark: '#1e2022' },
  foreground: { light: '#1A1A1A', dark: '#ECEDEE' },
  muted: { light: '#666666', dark: '#9BA1A6' },
  border: { light: '#E5E0D8', dark: '#334155' },
  success: { light: '#22C55E', dark: '#4ADE80' },
  warning: { light: '#F59E0B', dark: '#FBBF24' },
  error: { light: '#EF4444', dark: '#F87171' },
  // Checkpoint colors - Updated for correct checkpoint names
  motishaTuk: { light: '#FF7F3F', dark: '#FF9F5F' },  // Saffron orange - top checkpoint
  gheti: { light: '#22C55E', dark: '#4ADE80' },       // Green - Jatra completion
  sagaalPol: { light: '#2196F3', dark: '#64B5F6' },   // Blue - final descent
  // Legacy aliases
  aamli: { light: '#FF7F3F', dark: '#FF9F5F' },       // Maps to Motisha Tuk
  checkpointX: { light: '#2196F3', dark: '#64B5F6' }, // Maps to Sagaal Pol
};

module.exports = { themeColors };
