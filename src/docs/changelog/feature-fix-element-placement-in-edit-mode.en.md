# Stable page composer edit layout

## Edit mode uses normal-mode dimensions

The page composer edit overlay now measures its columns from the same content section dimensions that normal mode uses, while keeping row height bound to normal mode's row size. Edit cells keep the normal grid width, height, and gap while remaining absolutely positioned for drag and resize controls, preventing cards from growing or shrinking when layout editing is toggled.
