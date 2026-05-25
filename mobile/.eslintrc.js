module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Genel
    'no-console': ['warn', {allow: ['warn', 'error']}],
    'no-unused-vars': 'off', // TS versiyonu kullanılıyor

    // TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_'}],
    '@typescript-eslint/no-explicit-any': 'warn',

    // React
    'react/self-closing-comp': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-unused-styles': 'warn',
  },
};
