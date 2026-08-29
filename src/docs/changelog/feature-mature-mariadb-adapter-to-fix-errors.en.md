# Reliable MariaDB Startup

## MariaDB waits until ready

Cognis now retries transient MariaDB connection failures during a bounded startup window instead of failing migrations during database initialization. The deployment health check also allows MariaDB a longer initialization period.
