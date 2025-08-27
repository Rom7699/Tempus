// Utility function to create gradient colors from a base color
export const createGradient = (baseColor: string): [string, string] => {
  // Color mappings for gradients with more noticeable differences
  const colorGradients: { [key: string]: [string, string] } = {
    '#5D87FF': ['#5D87FF', '#B3C7FF'], // Blue to much lighter blue
    '#FF6B6B': ['#FF6B6B', '#FFB3B3'], // Red to much lighter red  
    '#4ECDC4': ['#4ECDC4', '#A8E6E0'], // Teal to much lighter teal
    '#FFD93D': ['#FFD93D', '#FFF099'], // Yellow to much lighter yellow
    '#6C5CE7': ['#6C5CE7', '#B8AEFF'], // Purple to much lighter purple
    '#FF8E8E': ['#FF8E8E', '#FFCCCC'], // Light red to much lighter red
    '#A29BFE': ['#A29BFE', '#D1CCFF'], // Light purple to much lighter purple
    '#74B9FF': ['#74B9FF', '#B3D9FF'], // Light blue to much lighter blue
    '#00B894': ['#00B894', '#66D9C4'], // Green to much lighter green
    '#FDCB6E': ['#FDCB6E', '#FEE5B8'], // Orange to much lighter orange
  };

  // Return the predefined gradient or create a fallback
  if (colorGradients[baseColor]) {
    return colorGradients[baseColor];
  }

  // Fallback: create a much lighter version of the base color
  const lighterColor = lightenColor(baseColor, 40);
  return [baseColor, lighterColor];
};

// Helper function to lighten a color by a percentage
const lightenColor = (color: string, percent: number): string => {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Lighten each component
  const lightenComponent = (component: number) => {
    return Math.min(255, Math.round(component + (255 - component) * (percent / 100)));
  };
  
  const newR = lightenComponent(r);
  const newG = lightenComponent(g);
  const newB = lightenComponent(b);
  
  // Convert back to hex
  const toHex = (component: number) => {
    const hex = component.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};

// Get the main color from a gradient (first color)
export const getMainColor = (gradient: [string, string]): string => {
  return gradient[0];
};

// Check if a color is the selected gradient
export const isGradientSelected = (selectedColor: string, gradientColor: string): boolean => {
  const gradient = createGradient(gradientColor);
  return selectedColor === gradient[0];
};