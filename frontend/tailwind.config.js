/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14171F",
        surface: "#1B1F2B",
        surfaceRaised: "#232838",
        paper: "#F2E9D8",
        paperShadow: "#DCCFAE",
        gold: "#E3B341",
        goldDim: "#B08A2E",
        teal: "#2FA88F",
        brick: "#C4432E",
        mist: "#8890A6",
      },
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "perforation-h":
          "radial-gradient(circle, #14171F 3px, transparent 3px)",
      },
      backgroundSize: {
        perf: "16px 16px",
      },
    },
  },
  plugins: [],
};
