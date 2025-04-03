import { DefaultTheme, DarkTheme } from '@react-navigation/native';

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007bff',
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#000000',
    border: '#dddddd',
    notification: '#ff3b30',
  },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#0a84ff',
    background: '#121212',
    card: '#1c1c1c',
    text: '#ffffff',
    border: '#333333',
    notification: '#ff453a',
  },
};