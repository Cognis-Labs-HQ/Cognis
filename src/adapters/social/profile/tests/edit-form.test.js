import test from "node:test";
import assert from "node:assert/strict";
import { createProfileEditFields } from "../ui/profile-edit-fields.js";

for (const role of ["user", "teacher", "admin", "owner"]) {
    test(`Profile edit opens with all field limits and ${role} visibility policy`, () => {
        const fields = new Map(
            createProfileEditFields(
                {
                    role,
                    displayName: "Name",
                    bio: "Bio",
                    location: "Place",
                    website: "https://example.com",
                    visibility: "friends",
                },
                { t: (key) => key },
            ).map((field) => [field.name, field]),
        );
        assert.equal(fields.get("displayName").maxCharacters, 80);
        assert.equal(fields.get("bio").maxCharacters, 200);
        assert.equal(fields.get("location").maxCharacters, 120);
        assert.equal(fields.get("website").maxCharacters, 2048);
        assert.equal(fields.get("displayName").value, "Name");
        assert.equal(fields.get("visibility").value, "friends");
        assert.equal(
            fields.get("visibility").options[0].disabled,
            role !== "user",
        );
        assert.equal(fields.get("visibility").options[2].disabled, false);
    });
}
