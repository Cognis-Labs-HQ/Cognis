import type { DbClassesStore } from "../store/index.js";
import type { ClassesRouteOptions } from "./route-helpers.js";

export function dispatchJoinRequestNotification(input: {
    options: ClassesRouteOptions;
    store: DbClassesStore;
    classId: string;
    studentAccountId: string;
    logMeta: Record<string, unknown>;
}) {
    const { options, store, classId, studentAccountId, logMeta } = input;
    store.getClassById(classId).then((classRow) => {
        if (!classRow) return;
        options
            .dispatchNotification?.({
                category: "study",
                recipientUsername: classRow.teacherAccountId,
                subject: "Class join request pending",
                body: `${studentAccountId} requested to join "${classRow.name || classRow.languageCode}".`,
                actionUrl: `/classroom?classId=${encodeURIComponent(classId)}`,
                metadata: {
                    classId,
                    studentAccountId,
                    status: "pending",
                },
            })
            .catch((error) => {
                options.log?.(
                    "error",
                    "Failed to dispatch join request notification.",
                    {
                        ...logMeta,
                        accountId: studentAccountId,
                        classId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
            });
    });
}

export function dispatchJoinReviewNotification(input: {
    options: ClassesRouteOptions;
    classId: string;
    className: string;
    teacherAccountId: string;
    studentAccountId: string;
    action: "approve" | "reject";
    logMeta: Record<string, unknown>;
}) {
    const {
        options,
        classId,
        className,
        teacherAccountId,
        studentAccountId,
        action,
        logMeta,
    } = input;
    const readableClassName = String(className ?? "").trim() || classId;
    options
        .dispatchNotification?.({
            category: "study",
            recipientUsername: studentAccountId,
            subject:
                action === "approve"
                    ? "Class join request approved"
                    : "Class join request rejected",
            body:
                action === "approve"
                    ? `Your request to join "${readableClassName}" was approved.`
                    : `Your request to join "${readableClassName}" was rejected.`,
            actionUrl: `/classroom?classId=${encodeURIComponent(classId)}`,
            metadata: {
                classId,
                className: readableClassName,
                teacherAccountId,
                action,
            },
        })
        .catch((error) => {
            options.log?.(
                "error",
                "Failed to dispatch join review notification.",
                {
                    ...logMeta,
                    accountId: teacherAccountId,
                    classId,
                    studentAccountId,
                    action,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
        });
}
