/**
 * Provides reusable pagination for structured data sets and navigation controls.
 *
 * Public exports:
 *   createPagination(options) — creates a stateful paginator for array records.
 *   renderPaginationControls(options) — renders Previous, status, and Next controls.
 *   bindPaginationControls(root, pagination, options) — binds rendered controls.
 *
 * Usage:
 *   const pagination = createPagination({ data: records, perPage: 10 });
 *   const page = pagination.getPage();
 *   root.innerHTML = renderPaginationControls({ page, labels, escapeHtml });
 *   bindPaginationControls(root, pagination, { onChange: render });
 *
 * @param {{ data?: Array<unknown>, perPage: number, initialPage?: number }} options
 * @returns {{ getPage: () => object, next: () => object, previous: () => object, setPage: (pageIndex: number) => object, updateData: (data: Array<unknown>) => object }}
 */

import { uiCtx } from "./ui-ctx.js";

export function createPagination({ data = [], perPage, initialPage = 0 } = {}) {
    if (!Number.isInteger(perPage) || perPage < 1) {
        throw new Error("Pagination perPage must be a positive integer.");
    }
    let records = Array.isArray(data) ? data : [];
    let pageIndex = Number.isInteger(initialPage)
        ? Math.max(0, initialPage)
        : 0;

    function getPage() {
        const pageCount = Math.max(1, Math.ceil(records.length / perPage));
        pageIndex = Math.min(pageIndex, pageCount - 1);
        return Object.freeze({
            items: records.slice(
                pageIndex * perPage,
                (pageIndex + 1) * perPage,
            ),
            pageIndex,
            pageNumber: pageIndex + 1,
            pageCount,
            perPage,
            totalCount: records.length,
            hasPrevious: pageIndex > 0,
            hasNext: pageIndex + 1 < pageCount,
        });
    }

    function setPage(nextPageIndex) {
        if (!Number.isInteger(nextPageIndex)) {
            throw new Error("Pagination page index must be an integer.");
        }
        pageIndex = Math.max(0, nextPageIndex);
        return getPage();
    }

    function updateData(nextData) {
        if (!Array.isArray(nextData)) {
            throw new Error("Pagination data must be an array.");
        }
        records = nextData;
        return getPage();
    }

    return {
        getPage,
        next: () => setPage(pageIndex + 1),
        previous: () => setPage(pageIndex - 1),
        setPage,
        updateData,
    };
}

/**
 * Renders standard pagination controls for a structured page result.
 *
 * @param {{ page: object, labels: { previous: string, next: string, status: string }, escapeHtml?: (value: unknown) => string, ariaLabel?: string }} options
 * @returns {string}
 */
export function renderPaginationControls({
    page,
    labels,
    escapeHtml = (value) => String(value),
    ariaLabel = "",
}) {
    const status = String(labels.status ?? "")
        .replace("{{current}}", String(page.pageNumber))
        .replace("{{total}}", String(page.pageCount));
    return `<nav class="pagination-controls" aria-label="${escapeHtml(ariaLabel)}">
        <button class="btn-neutral" type="button" data-pagination-previous${page.hasPrevious ? "" : " disabled"}>${escapeHtml(labels.previous)}</button>
        <span>${escapeHtml(status)}</span>
        <button class="btn-neutral" type="button" data-pagination-next${page.hasNext ? "" : " disabled"}>${escapeHtml(labels.next)}</button>
    </nav>`;
}

/**
 * Binds the standard pagination buttons to a paginator.
 *
 * @param {HTMLElement} root
 * @param {{ next: () => object, previous: () => object }} pagination
 * @param {{ onChange?: (page: object) => void }} options
 * @returns {void}
 */
export function bindPaginationControls(root, pagination, { onChange } = {}) {
    root?.querySelector("[data-pagination-previous]")?.addEventListener(
        "click",
        () => onChange?.(pagination.previous()),
    );
    root?.querySelector("[data-pagination-next]")?.addEventListener(
        "click",
        () => onChange?.(pagination.next()),
    );
}

uiCtx.capabilities.contribute("ui:pagination", {
    createPagination,
    renderPaginationControls,
    bindPaginationControls,
});
