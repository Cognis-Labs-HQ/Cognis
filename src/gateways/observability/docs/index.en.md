# Observability gateway

The gateway exposes the vendor-neutral `observability:metrics` ctx capability and a size-limited, sampled browser telemetry endpoint. Metric names and labels are allowlisted to keep cardinality bounded. Deployments can replace the capability sink without coupling routes or gateways to a telemetry vendor.
