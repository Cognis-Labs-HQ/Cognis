# Portable Marketplace Tests

## Skip Git checkout coverage when Git is unavailable

The marketplace checkout integration test now detects whether Git is installed and skips only its Git-dependent scenario in minimal CI environments.
