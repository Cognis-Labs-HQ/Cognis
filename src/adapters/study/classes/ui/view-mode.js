export function canToggleClassroomView() {
    return (
        String(localStorage.getItem("cognis_role") ?? "")
            .trim()
            .toLowerCase() === "teacher"
    );
}

function getViewUrl(url = window.location.href) {
    return new URL(url, window.location.origin);
}

export function getClassroomViewMode(url = window.location.href) {
    if (!canToggleClassroomView()) {
        return "student";
    }
    return getViewUrl(url).searchParams.get("student") === "true"
        ? "student"
        : "teacher";
}

export function setClassroomViewMode(mode, url = window.location.href) {
    if (!canToggleClassroomView()) return "student";
    const normalizedMode = mode === "student" ? "student" : "teacher";
    const nextUrl = getViewUrl(url);
    if (normalizedMode === "student") {
        nextUrl.searchParams.set("student", "true");
    } else {
        nextUrl.searchParams.delete("student");
    }
    if (url === window.location.href) {
        window.history.replaceState({}, "", nextUrl.pathname + nextUrl.search);
    }
    return normalizedMode;
}

export function applyClassroomViewModeFromUrl(url = window.location.href) {
    return getClassroomViewMode(url);
}
