import test from "node:test";
import assert from "node:assert/strict";
import { skip, startFixture } from "./reuse/browser.js";

test(
    "a widened saved card renders without implicit grid columns",
    { skip },
    async (context) => {
        const saved = {
            layoutsByGrid: {
                "cols-8": {
                    placements: [{ id: "form", col: 6, row: 0, w: 2, h: 4 }],
                    hidden: [],
                },
            },
        };
        const { browser } = await startFixture(
            context,
            "?scenario=right-edge&empty-toolbar",
            [844, 900],
            {
                apiResponses: {
                    "/api/v1/social/users/fixture/preferences/responsive-grid":
                        {
                            data: { layoutJson: JSON.stringify(saved) },
                        },
                },
            },
        );
        const grid = await browser.evaluate(`(() => {
        const grid = document.querySelector('.composer-view-grid');
        const card = grid.querySelector('[data-composer-element="form"]');
        const style = getComputedStyle(grid);
        return {
            declaredColumns: Number(style.getPropertyValue('--grid-cols')),
            renderedColumns: style.gridTemplateColumns.trim().split(/\\s+/).length,
            cardColumn: card.style.gridColumn,
            card: card.getBoundingClientRect().toJSON(),
            bounds: grid.getBoundingClientRect().toJSON(),
        };
    })()`);
        assert.equal(
            grid.declaredColumns,
            8,
            "Fixture reaches the eight-column boundary",
        );
        assert.equal(
            grid.renderedColumns,
            grid.declaredColumns,
            "No implicit column is created",
        );
        assert.equal(
            grid.cardColumn,
            "1 / span 3",
            "Card is moved to a row that fits its minimum",
        );
        assert.ok(
            grid.card.left >= grid.bounds.left &&
                grid.card.right <= grid.bounds.right + 1,
        );
    },
);
