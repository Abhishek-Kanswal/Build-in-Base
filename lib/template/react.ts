export const basePrompt = `<boltArtifact id=\"project-import\" title=\"Project Files\"><boltAction type=\"file\" filePath=\"index.html\"><!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <link rel=\"icon\" type=\"image/svg+xml\" href=\"/vite.svg\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id=\"root\"></div>
    <script type=\"module\" src=\"/src/main.tsx\"></script>
  </body>
</html>
</boltAction><boltAction type=\"file\" filePath=\"package.json\">{
  \"name\": \"vite-react-typescript-starter\",
  \"private\": true,
  \"version\": \"0.0.0\",
  \"type\": \"module\",
  \"scripts\": {
    \"dev\": \"vite\",
    \"build\": \"vite build\",
    \"preview\": \"vite preview\"
  },
  \"dependencies\": {
    \"lucide-react\": \"^0.344.0\",
    \"react\": \"^18.3.1\",
    \"react-dom\": \"^18.3.1\"
  },
  \"devDependencies\": {
    \"@types/react\": \"^18.3.5\",
    \"@types/react-dom\": \"^18.3.0\",
    \"@vitejs/plugin-react\": \"^4.3.1\",
    \"autoprefixer\": \"^10.4.18\",
    \"postcss\": \"^8.4.35\",
    \"tailwindcss\": \"^3.4.1\",
    \"typescript\": \"^5.5.3\",
    \"vite\": \"^5.4.2\"
  }
}
</boltAction><boltAction type=\"file\" filePath=\"postcss.config.js\">export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
</boltAction><boltAction type=\"file\" filePath=\"tailwind.config.js\">/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
</boltAction><boltAction type=\"file\" filePath=\"tsconfig.app.json\">{
  \"compilerOptions\": {
    \"target\": \"ES2020\",
    \"useDefineForClassFields\": true,
    \"lib\": [\"ES2020\", \"DOM\", \"DOM.Iterable\"],
    \"module\": \"ESNext\",
    \"skipLibCheck\": true,
    \"moduleResolution\": \"bundler\",
    \"allowImportingTsExtensions\": true,
    \"isolatedModules\": true,
    \"moduleDetection\": \"force\",
    \"noEmit\": true,
    \"jsx\": \"react-jsx\",
    \"strict\": true
  },
  \"include\": [\"src\"]
}
</boltAction><boltAction type=\"file\" filePath=\"tsconfig.json\">{
  \"files\": [],
  \"references\": [
    { \"path\": \"./tsconfig.app.json\" },
    { \"path\": \"./tsconfig.node.json\" }
  ]
}
</boltAction><boltAction type=\"file\" filePath=\"tsconfig.node.json\">{
  \"compilerOptions\": {
    \"target\": \"ES2022\",
    \"lib\": [\"ES2023\"],
    \"module\": \"ESNext\",
    \"skipLibCheck\": true,
    \"moduleResolution\": \"bundler\",
    \"allowImportingTsExtensions\": true,
    \"isolatedModules\": true,
    \"moduleDetection\": \"force\",
    \"noEmit\": true,
    \"strict\": true
  },
  \"include\": [\"vite.config.ts\"]
}
</boltAction><boltAction type=\"file\" filePath=\"vite.config.ts\">import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
});
</boltAction><boltAction type=\"file\" filePath=\"src/App.tsx\">import React from 'react';

function App() {
  return (
    <div className=\"min-h-screen bg-gray-100 flex items-center justify-center\">
      <p>Start prompting (or editing) to see magic happen :)</p>
    </div>
  );
}

export default App;
</boltAction><boltAction type=\"file\" filePath=\"src/index.css\">@tailwind base;
@tailwind components;
@tailwind utilities;
</boltAction><boltAction type=\"file\" filePath=\"src/main.tsx\">import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
</boltAction><boltAction type=\"file\" filePath=\"src/vite-env.d.ts\">/// <reference types=\"vite/client\" />
</boltAction></boltArtifact>`;