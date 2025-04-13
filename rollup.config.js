import typescript from "@rollup/plugin-typescript";

export default [
  createConfiguration("cjs", "cjs"),
  createConfiguration("es", "mjs"),
];

function createConfiguration(format, extension) {
  return {
    input: "src/index.ts",
    output: {
      format,
      dir: "dist",
      entryFileNames: `[name].${extension}`,
      chunkFileNames: `[name]-[hash].${extension}`,
    },
    plugins: [
      typescript({
        include: ["./src/**"],
      }),
    ],
  };
}
