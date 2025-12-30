import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  // Base JS rules
  {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },

  // TypeScript rules
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    rules: {
      // 🔒 Common company rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ], // 🚫 No unused variables
      '@typescript-eslint/no-explicit-any': 'error', // 🚫 Disallow `any`
      '@typescript-eslint/consistent-type-imports': 'error',

      // 🚀 Backend safety
      'no-console': 'off', // APIs need logging
      'no-undef': 'off',

      // Async safety
      '@typescript-eslint/no-misused-promises': 'error',

      // ========== Custom Rules ==========

      // 🚫 Force explicit function return types
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: false,
          allowTypedFunctionExpressions: false,
          allowHigherOrderFunctions: false,
        },
      ],

      // 🚫 Require types on function parameters
      '@typescript-eslint/typedef': [
        'error',
        {
          parameter: true,
          propertyDeclaration: true,
          memberVariableDeclaration: true,
        },
      ],
    },
  },
]);
