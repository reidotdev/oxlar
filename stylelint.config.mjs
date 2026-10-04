/**
 * Token rules. Raw design values live in src/styles/tokens.css and nowhere else.
 *
 * To add an exception: put `/* stylelint-disable-next-line declaration-property-value-disallowed-list -- reason *\/`
 * on the line above, and say WHY in the reason. Prefer adding a token instead.
 */
const rawColor = String.raw`/(#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\()/i`;
const rawPx = String.raw`/\d+(\.\d+)?px\b/`;

export default {
  extends: ["stylelint-config-standard"],
  overrides: [
    { files: ["**/*.astro", "**/*.html"], customSyntax: "postcss-html" },
    {
      files: ["src/styles/tokens.css"],
      rules: { "declaration-property-value-disallowed-list": null },
    },
  ],
  rules: {
    "declaration-property-value-disallowed-list": [
      {
        "/^(?!--).*/": [rawColor],
        "/^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|font-size|line-height|letter-spacing)/":
          [rawPx],
      },
      {
        message:
          "Raw colour and px spacing/type values belong in src/styles/tokens.css. Use a token.",
      },
    ],
    // Astro scoped styles, :global(), nesting and layers.
    "selector-pseudo-class-no-unknown": [
      true,
      { ignorePseudoClasses: ["global", "defined"] },
    ],
    "selector-class-pattern": null,
    "custom-property-pattern": null,
    "declaration-empty-line-before": null,
    "value-keyword-case": null,
    "no-descending-specificity": null,
    "at-rule-no-unknown": [
      true,
      { ignoreAtRules: ["starting-style", "view-transition"] },
    ],
    "property-no-unknown": [
      true,
      {
        ignoreProperties: [
          "position-area",
          "position-try-fallbacks",
          "interpolate-size",
        ],
      },
    ],
    "declaration-property-value-no-unknown": null,
    "rule-empty-line-before": null,
    "color-function-notation": null,
    "alpha-value-notation": null,
    "selector-not-notation": null,
    "media-feature-range-notation": null,
    "comment-empty-line-before": null,
    "declaration-block-no-redundant-longhand-properties": null,
    "shorthand-property-no-redundant-values": null,
    "import-notation": null,
    "property-no-vendor-prefix": null,
    "lightness-notation": null,
    "hue-degree-notation": null,
    "custom-property-empty-line-before": null,
  },
};
