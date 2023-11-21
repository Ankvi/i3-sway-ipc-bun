import { describe, expect, test } from "bun:test";
import { Root } from "../../types/root";
import { findFocused } from "../windowDimming";
import { Content } from "../../types/content";

describe("Window dimming tests", () => {
    describe("findFocused tests", async () => {
        const getTreeData = await Bun.file(
            `${import.meta.dir}/testData/get_tree.json`,
        ).json<Root>();
        test("Should find correct focused entry from test data", async () => {
            const expected = await Bun.file(`${import.meta.dir}/testData/expected_focused_node.json`).json<Content>();
            const focused = findFocused(getTreeData);
            expect(focused).toEqual(expected);
        });
    });
});
