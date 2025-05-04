# Changelog

VS Code plugin `NDF` change log

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to[Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## 2.2.2 - 2025-05-04

### Fixed

1. Resolved the issue where the underlying type of `map` type was displayed on hover.
2. Addressed the issue where the syntax analysis omitted the analysis of **property definition** syntax.
3. Fixed the parsing failure in syntax analysis for `template parameters`, `member assignments`, and `object parameters` when assignments were followed by line breaks and comments.

### Added

1. Implemented global symbol building, caching, and lookup functionality.
2. Retained comments by adding comment nodes for both **syntax analysis** and **semantic analysis**.
3. Added functionality to import symbols via comments.

### Changed

1. Permitted the declaration of new `members` within `object definitions`, thus disabling the `NEA25` warning.


## 2.1.1 - 2025-04-25

### Fixed

1. Fixed the issue where member types were not displayed during hover for anonymous object instantiation when the blueprint could not be found.
2. Fixed the issue where the variable regex matching in highlighting was too broad.


## 2.1.0 - 2025-04-25

### Added

1. Implement the function of `strict`/`loose`/`ignore` mode
2. Support localized language


## 2.0.4 - 2025-04-24

### Fixed

1. Fix issue where the binary operator `|` incorrectly results in a `boolean` type.
2. Fix problem with duplicate display of generic types.
3. Fix the misalignment of error markers when accessing member types on unsupported types
