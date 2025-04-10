#!/bin/bash

# Removes .ts or .js extensions from relative import paths in .ts files under ./src
# macOS/BSD-compatible sed syntax

find ./src -name '*.ts' | while read file; do
  echo "Updating $file"
  # Remove .ts from import paths
  sed -i '' -E "s/(from ['\"]\.{1,2}\/[^'\"]+)\.ts(['\"])/\1\2/g" "$file"
  # Remove .js from import paths
  sed -i '' -E "s/(from ['\"]\.{1,2}\/[^'\"]+)\.js(['\"])/\1\2/g" "$file"
done

echo "✅ Done: Removed .ts/.js extensions from relative imports."
