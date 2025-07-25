import type { Config } from "tailwindcss"

const config =  {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {},
    },
    plugins: [
      require("daisyui"),
      require('@tailwindcss/typography'),
    ],
    daisyui: {
      themes: ["light", "dark"],
    },
  }

export default config