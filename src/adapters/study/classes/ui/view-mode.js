const CLASSROOM_VIEW_MODE_KEY = "study:classes:view-mode";

export function canToggleClassroomView() {
    return (
        String(localStorage.getItem("cognis_role") ?? "")
            .trim()
            .toLowerCase() === "teacher"
    );
}

export function getClassroomViewMode() {
    if (!canToggleClassroomView()) {
        return "student";
    }
    return localStorage.getItem(CLASSROOM_VIEW_MODE_KEY) === "student"
        ? "student"
        : "teacher";
}

export function setClassroomViewMode(mode) {
    if (!canToggleClassroomView()) return "student";
    const normalizedMode = mode === "student" ? "student" : "teacher";
    localStorage.setItem(CLASSROOM_VIEW_MODE_KEY, normalizedMode);
    return normalizedMode;
}

export function applyClassroomViewModeFromUrl(url = window.location.href) {
    const nextUrl = new URL(url, window.location.origin);
    const requestedMode = nextUrl.searchParams.get("classroomView");
    if (requestedMode === "student" || requestedMode === "teacher") {
        setClassroomViewMode(requestedMode);
        nextUrl.searchParams.delete("classroomView");
        window.history.replaceState({}, "", nextUrl.pathname + nextUrl.search);
    }
    return getClassroomViewMode();
}
