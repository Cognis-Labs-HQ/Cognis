import assert from "node:assert/strict";
import test from "node:test";

import { createPagination, renderPaginationControls } from "../pagination.js";

test("pagination returns structured pages for a caller-selected page size", () => {
    const records = Array.from({ length: 23 }, (_, id) => ({ id }));
    const pagination = createPagination({ data: records, perPage: 10 });

    assert.deepEqual(pagination.getPage().items, records.slice(0, 10));
    const secondPage = pagination.next();
    assert.equal(secondPage.pageNumber, 2);
    assert.equal(secondPage.pageCount, 3);
    assert.equal(secondPage.totalCount, 23);
    assert.equal(secondPage.hasPrevious, true);
    assert.equal(secondPage.hasNext, true);
    assert.deepEqual(pagination.next().items, records.slice(20));
});

test("pagination clamps its page when a structured data set shrinks", () => {
    const pagination = createPagination({ data: [1, 2, 3, 4], perPage: 2 });
    pagination.setPage(1);
    const page = pagination.updateData([{ id: "remaining" }]);

    assert.equal(page.pageIndex, 0);
    assert.deepEqual(page.items, [{ id: "remaining" }]);
});

test("pagination validates caller-controlled page sizes", () => {
    assert.throws(() => createPagination({ data: [], perPage: 0 }), /perPage/);
    assert.throws(
        () => createPagination({ data: [], perPage: 1.5 }),
        /perPage/,
    );
});

test("pagination controls render localized structured page state", () => {
    const page = createPagination({ data: [1, 2, 3], perPage: 2 }).getPage();
    const html = renderPaginationControls({
        page,
        labels: {
            previous: "Previous",
            next: "Next",
            status: "Page {{current}} of {{total}}",
        },
        ariaLabel: "Pages",
    });

    assert.match(html, /data-pagination-previous disabled/);
    assert.match(html, /Page 1 of 2/);
    assert.match(html, /data-pagination-next/);
});
