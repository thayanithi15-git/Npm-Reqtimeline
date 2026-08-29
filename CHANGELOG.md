# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-29

### Added
- Initial release of `reqtimeline`.
- Express 4 and Express 5 request lifecycle profiling middleware.
- Named middleware timing with `timeline.mark("name")` and wrapper syntax.
- Dynamic runtime profiling via `req.timeline.mark()` and `req.timeline.time()`.
- High-resolution `performance.now()` internal timing calculation.
- Configurable slow-step threshold detection (`slowThreshold`).
- Terminal box-drawing formatter with color support.
- Structured JSON output mode for programmatic diagnostics.
- Non-intrusive safety wrappers and production bypass (`enabled: false`).
