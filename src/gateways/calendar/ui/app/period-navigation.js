export function calendarDate(now, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
    }).formatToParts(now);
    const values = Object.fromEntries(
        parts.map(({ type, value }) => [type, value]),
    );
    return new Date(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
    );
}

function periodStart(date, view, weekStartsOn) {
    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );
    if (view === "year") result.setMonth(0, 1);
    if (view === "month") result.setDate(1);
    if (view === "week")
        result.setDate(
            result.getDate() - ((result.getDay() - weekStartsOn + 7) % 7),
        );
    return result.getTime();
}

export function isCurrentPeriod(
    selectedDate,
    view,
    now,
    timeZone,
    weekStartsOn = 0,
) {
    return (
        periodStart(selectedDate, view, weekStartsOn) ===
        periodStart(calendarDate(now, timeZone), view, weekStartsOn)
    );
}

export function nextDateChange(now, timeZone) {
    const currentDate = calendarDate(now, timeZone).getTime();
    let lower = now.getTime();
    let upper = lower + 36 * 60 * 60 * 1000;
    while (upper - lower > 1) {
        const middle = Math.floor((lower + upper) / 2);
        if (calendarDate(new Date(middle), timeZone).getTime() === currentDate)
            lower = middle;
        else upper = middle;
    }
    return upper - now.getTime();
}

export function bindCurrentPeriod({
    root,
    getDate,
    getView,
    getTimeZone,
    signal,
}) {
    let timer;
    function refresh() {
        window.clearTimeout(timer);
        if (signal?.aborted) return;
        const now = new Date();
        const timeZone = getTimeZone();
        const active = isCurrentPeriod(getDate(), getView(), now, timeZone);
        const button = root.querySelector('[data-calendar-nav="today"]');
        button?.classList.toggle("active", active);
        button?.setAttribute("aria-pressed", String(active));
        timer = window.setTimeout(refresh, nextDateChange(now, timeZone));
    }
    window.addEventListener("focus", refresh, { signal });
    document.addEventListener("visibilitychange", refresh, { signal });
    signal?.addEventListener("abort", () => window.clearTimeout(timer), {
        once: true,
    });
    return refresh;
}
