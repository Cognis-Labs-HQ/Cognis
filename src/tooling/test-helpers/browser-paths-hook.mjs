import { register } from "node:module";

register(new URL("./browser-paths-resolver.mjs", import.meta.url));
