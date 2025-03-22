export default {
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  printWidth: 100,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: [
    './config/env.js', // Make env.js always first (no regex needed with Trivago)
    '^[^.]', // Third party modules
    '^[./]', // Local imports
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
