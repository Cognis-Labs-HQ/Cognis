export type DeprovisionOutcome =
    | {
          persisted: true;
          username: string;
          action: "delete" | "disable" | "archive";
          revokedTokenCount?: number;
      }
    | {
          persisted: false;
          reason: string;
          status: 400 | 403 | 404 | 503;
      };

/** Owner-authenticated outcome of one exact deprovision invocation, not public flow data. */
export interface DeprovisionOutcomes {
    read(
        input: unknown,
        stageResults: object,
    ): Readonly<DeprovisionOutcome> | undefined;
    deletedAccount(input: unknown, stageResults: object): string | undefined;
}
