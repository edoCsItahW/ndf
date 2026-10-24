# Changelog

VS Code plugin `NDF` change log

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to[Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## 3.0.0 - 2026-10-24

### BREAKING CHANGES

1. The language implementation now follows `NDF.g4` v2.0 (reverse-engineered from the official manual and the whole
   WARNO `base.zip` corpus). The v1 grammar is no longer supported.
2. Soft keywords: built-in type names and container names (`int`, `float3`, `RGB`, `LIST`, `PAIR`, …) are lexed as
   identifiers and resolved contextually, so they can also be used as names (`RGB is 2`).
3. `/` is no longer an arithmetic operator; division is only written with `div`. `/` is a namespace/enum path separator.
4. Type references now support both `LIST<T>` and `[required]` / `[GroupBy = "…"]` / `[>= 0]` annotation suffixes, and
   both at once (`LIST<TActionDescriptor>[required]`).
5. `TypeConstructor` nodes are gone: `float3[0, 0, 0]`, `sqr[x]` and `lerp[a, b, c]` are all `IndexAccess`.
6. `Reference` now stores a path (`segments`) instead of a single name; `MemberAccess` supports both `/` and `.`.

### Added

1. `GUID:{8-4-4-4-12}` is lexed as a single `GUID` token.
2. Hexadecimal integers (`0xFF00A8`) and the short float forms `53.` / `.127`.
3. Single-quoted strings (no escape sequences), `(* … *)` block comments, `///` documentation/import comments.
4. `True` / `False` boolean spellings are treated as booleans.
5. `Program.comments` keeps non-statement comments so semantic highlighting covers comments inside object bodies.

### Changed

1. Layout is insignificant: members/arguments may be separated by commas, newlines, comments or a single space, and
   two statements may even touch each other (`…'x.fbx'export Y is …`).
2. Nested definitions are allowed as values (`Member = Named is TType ( … )`) via `DefinitionExpr`.
3. Arguments may be positional or typed (`Name : Type = default`); modifiers are accepted on members and arguments.
4. Hover, completion, semantic tokens and the analyser were updated to the v2 AST.

### Fixed

1. `float2` / `float3` / `RGB` and friends no longer crash the parser (the old `BuiltinType` rule only knew four names).
2. `MAP<…>` (type) and `MAP[…]` (literal) no longer share one keyword classification.
3. Comments between a type name and its body (`BUCKListDescriptor // … (`) no longer break parsing.
4. Trailing commas, annotations with defaults, and objects whose body starts on the next line all parse now.
5. `server/test.ndf` and `server/lib.d.ndf` parse with zero syntax errors; the whole 4564-file WARNO corpus parses
   with zero syntax errors as well.


## 2.4.5 - 2025-05-23

### Added

1. Implemented code completion functionality

### Changed

1. Changed the default setting for automatically injecting import comments to false

### Fixed

1. Fixed the issue of type information being lost during global symbol construction.


## 2.3.4 - 2025-05-09

### Added

1. Added semantic highlighting support


## 2.2.4 - 2025-05-06

### Fixed

1. Fixed synchronization issues during parallel builds
2. Added missing public keyword related syntax.

### Changed

1. Optimized the speed and performance of global symbol construction, achieving nearly 100% symbol construction in one
   go
2. Improved the speed of global symbol lookup during file parsing, reducing it from minutes to seconds


## 2.2.3 - 2025-05-05

### Fixed

1. Fix the issue where global build does not start when the number of processes, threads, and coroutines is 0


## 2.2.2 - 2025-05-04

### Fixed

1. Resolved the issue where the underlying type of `map` type was displayed on hover.
2. Addressed the issue where the syntax analysis omitted the analysis of **property definition** syntax.
3. Fixed the parsing failure in syntax analysis for `template parameters`, `member assignments`, and `object parameters`
   when assignments were followed by line breaks and comments.

### Added

1. Implemented global symbol building, caching, and lookup functionality.
2. Retained comments by adding comment nodes for both **syntax analysis** and **semantic analysis**.
3. Added functionality to import symbols via comments.

### Changed

1. Permitted the declaration of new `members` within `object definitions`, thus disabling the `NEA25` warning.


## 2.1.1 - 2025-04-25

### Fixed

1. Fixed the issue where member types were not displayed during hover for anonymous object instantiation when the
   blueprint could not be found.
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
