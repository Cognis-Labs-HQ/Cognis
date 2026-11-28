import type { Ctx } from "@cognis/core";
import type { StudyAdapterBootstrapCtx } from "../../../gateways/study/gateway.js";
import type {
    LibraryService,
    LibraryProviderCapability,
} from "./service/index.js";

/** Withdraw discoverable contracts and reject retained handles while unavailable. */
export function registerLibraryCapabilities(
    ctx: StudyAdapterBootstrapCtx,
    service: LibraryService,
): void {
    const system = ctx.capabilities.require<Ctx>("system:ctx");
    const guard =
        <Arguments extends unknown[], Result>(
            operation: (...args: Arguments) => Result,
        ) =>
        (...args: Arguments): Result => {
            if (!ctx.isAdapterEnabled())
                throw new Error("study_library_unavailable");
            return operation(...args);
        };
    const registerConstructor = guard(
        service.registerFormContribution.bind(service),
    );
    const provider: LibraryProviderCapability = {
        transformationModel: "generated",
        inspectContentPack: guard(service.inspectContentPack.bind(service)),
        ingestContentPack: guard(service.ingestContentPack.bind(service)),
        deleteContentPack: guard(service.deleteContentPack.bind(service)),
        registerConstructor,
        registerLookupProvider: guard(
            service.registerLookupProvider.bind(service),
        ),
    };
    ctx.onAvailabilityChange((enabled) => {
        if (enabled) {
            ctx.capabilities.contribute("study:library", service);
            ctx.capabilities.contribute(
                "study:library:registerFormContribution",
                registerConstructor,
            );
            system.contributePublicCapability(
                "study:library:registerConstructor",
                registerConstructor,
            );
            system.contributePublicCapability(
                "study:library:provider",
                provider,
            );
        } else {
            ctx.capabilities.remove("study:library");
            ctx.capabilities.remove("study:library:registerFormContribution");
            system.removeCapability("study:library:registerConstructor");
            system.removeCapability("study:library:provider");
        }
    });
}
