const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  // static passthrough
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/content/writeups/**/*.{png,jpg,jpeg,gif,svg,webp}": "" });
  eleventyConfig.addPassthroughCopy({ "src/content/notes/**/*.{png,jpg,jpeg,gif,svg,webp}": "" });

  // ─── Collections ───────────────────────────────
  eleventyConfig.addCollection("writeups", (api) =>
    api.getFilteredByGlob("src/content/writeups/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addCollection("notes", (api) =>
    api.getFilteredByGlob("src/content/notes/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addCollection("projects", (api) =>
    api.getFilteredByGlob("src/content/projects/*.md").sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99))
  );

  // ─── Filters ────────────────────────────────────
  eleventyConfig.addFilter("dateReadable", (dateObj) => {
    if (!dateObj) return "";
    return new Date(dateObj).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  });

  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));

  eleventyConfig.addGlobalData("buildYear", () => new Date().getFullYear());

  // Unique + sorted list of tags/categories across a collection
  eleventyConfig.addFilter("uniqueValues", (arr, key) => {
    const set = new Set();
    (arr || []).forEach((item) => {
      const val = item.data[key];
      if (Array.isArray(val)) val.forEach((v) => set.add(v));
      else if (val) set.add(val);
    });
    return [...set].sort();
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
