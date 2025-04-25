# Changelog

VS Code plugin `NDF` change log

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to[Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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
