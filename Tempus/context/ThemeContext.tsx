import React, { createContext, useContext, useState } from 'react';

// Define light and dark themes
const lightTheme = {
  background: '#f5f5f5',
  text: '#000000',
  primary: '#5D87FF',
  secondary: '#AEAEAE',
  card: '#ffffff',
};

const darkTheme = {
  background: '#121212',
  text: '#ffffff',
  primary: '#5D87FF',
  secondary: '#AEAEAE',
  card: '#1e1e1e',
};

// Define types
type Theme = typeof lightTheme;
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

// Create the ThemeContext
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use the theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ThemeProvider component
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false); // Toggle between light and dark themes

  const theme = isDarkMode ? darkTheme : lightTheme;

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};