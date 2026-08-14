# Reliable language switcher controls

## Prevented floating-control overlap

The language switcher now moves above the layout editor control when page customization is available.

## Preserved language synchronization

Changing only switcher visibility no longer changes browser-synchronized language priority to manual mode.

## Made delayed switching lifecycle-safe

Remounting the dashboard cancels stale language commits, and the final selection now runs through an extensible staged UI flow.

## Separated settings markup

The language preference interface now comes from a dedicated HTML template instead of embedded JavaScript markup.

## Added language flags

The dashboard switcher and language preference tables now present each installed UI language with its SVG flag.
