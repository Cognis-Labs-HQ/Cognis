export interface FlowPayloadFieldContract {
    key: string;
    type: string;
    description: string;
    required?: boolean;
}

export interface FlowPayloadContract {
    description?: string;
    fields?: readonly FlowPayloadFieldContract[];
}

export interface FlowStageContract {
    id: string;
    description: string;
    input?: FlowPayloadContract;
    output?: FlowPayloadContract;
}

export interface CanonicalFlowContract {
    id: string;
    owner: string;
    description: string;
    stages: readonly FlowStageContract[];
}

function freezePayloadContract(
    payload?: FlowPayloadContract,
): FlowPayloadContract | undefined {
    if (!payload) {
        return undefined;
    }
    return Object.freeze({
        ...payload,
        fields: payload.fields
            ? Object.freeze(
                  [...payload.fields].map((field) =>
                      Object.freeze({ ...field }),
                  ),
              )
            : undefined,
    });
}

function freezeStageContract(stage: FlowStageContract): FlowStageContract {
    return Object.freeze({
        id: stage.id,
        description: stage.description,
        input: freezePayloadContract(stage.input),
        output: freezePayloadContract(stage.output),
    });
}

export function createFlowContract(
    flow: CanonicalFlowContract,
): CanonicalFlowContract {
    return Object.freeze({
        ...flow,
        stages: Object.freeze(flow.stages.map(freezeStageContract)),
    });
}
