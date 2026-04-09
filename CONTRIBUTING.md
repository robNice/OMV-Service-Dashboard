# Contributing

Contributions are welcome.

This project is especially interested in contributions in these areas:

- Themes: fixes, refinements, and completely new themes
- Localizations: new languages, wording improvements, and translation fixes
- NAS Portal improvements: features, bug fixes, and general maintenance

## Before You Start

- Open an issue first if you plan a larger feature, major visual redesign, or structural refactor
- Keep changes focused and avoid unrelated cleanup in the same pull request
- Update documentation when behavior, configuration, or theme structure changes

## Theme Contributions

Theme contributions are welcome for:

- Built-in theme fixes and polish
- New built-in themes
- Improvements to theme settings, styling, and theme-specific JavaScript

Please keep in mind:

- Follow the theme structure documented in [`CONFIG_README.md`](./CONFIG_README.md)
- Keep theme-specific behavior inside the theme directory when possible
- Include screenshots or a short visual description for visible frontend changes
- If you add new theme metadata or settings, document them

## Localization Contributions

Localization contributions are welcome for:

- New translations
- Fixes for existing wording
- Consistency improvements across admin and public UI texts

Please keep in mind:

- Preserve existing JSON structure and keys
- Keep wording natural and consistent within the target language
- If you add new UI text, include the corresponding translation updates

## NAS Portal Improvements

General code contributions are welcome for:

- Bug fixes
- Smaller feature additions
- Performance, maintainability, and usability improvements

Please keep in mind:

- Keep behavior changes understandable and well scoped
- Add or update tests when practical
- Mention operational or migration impact if your change affects config, assets, or runtime behavior

## Pull Requests

For pull requests, please:

- open pull requests against the `dev` branch only
- describe what changed and why
- mention affected areas such as themes, translations, admin, or runtime behavior
- include screenshots for visible UI changes where useful
- note any follow-up work or open questions

Thank you for helping improve NAS Portal.
