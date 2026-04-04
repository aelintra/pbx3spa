import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['vite.config.js', 'scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  },
  eslintConfigPrettier
]
