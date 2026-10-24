import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { mount } from "./app/index.js";

export { mount };

await mountWhenDirect(mount);
