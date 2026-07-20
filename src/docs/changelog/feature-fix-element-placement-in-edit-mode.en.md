# Stable page composer edit layout

## Edit mode uses normal-mode dimensions

The page composer edit overlay now measures its cells from the same content section dimensions that normal mode uses instead of relying on fixed 90px units. Edit cells keep the normal grid width and gap while remaining absolutely positioned for drag and resize controls, preventing cards from growing or shrinking when layout editing is toggled.
