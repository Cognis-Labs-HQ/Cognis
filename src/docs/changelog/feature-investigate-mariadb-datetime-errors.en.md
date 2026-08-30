# MariaDB Datetime Repair

## Account registration accepts ISO timestamps

MariaDB now recognizes fully qualified column names in datetime errors and retries raw-schema writes with canonical `DATETIME` values, preventing account registration from terminating the API runtime.
