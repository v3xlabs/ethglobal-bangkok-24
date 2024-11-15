import { colors, cssVars } from "@ensdomains/thorin";

/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                // Hack to get VS Code to preview the colors
                thorin: Object.fromEntries(
                    Object.entries(cssVars.color).map(([key, value]) => [
                        key,
                        `${value} /* ${colors.light[key]} */`,
                    ])
                ),
            },
        },
    },
    plugins: [],
};
