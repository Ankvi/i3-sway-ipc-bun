import { describe, expect, test } from "bun:test";
import type { Root } from "../../types/containers";
import { findFocused } from "../windowDimming";
import { flattenTree } from "../../utilities";

const getTreeData: Root = await Bun.file(`${import.meta.dir}/testData/get_tree.json`).json();

describe("Window dimming tests", () => {
	describe("findFocused tests", async () => {
		test("Should find correct focused entry from test data", async () => {
			const expected = await Bun.file(
				`${import.meta.dir}/testData/expected_focused_node.json`,
			).json();
			const focused = findFocused(getTreeData);
			expect(focused).toEqual(expected);
		});
	});

	describe("flatten tests", () => {
		test("flatten should return the correct number of containers", () => {
			const flattened = flattenTree(getTreeData);
			expect(flattened).toHaveLength(20);
		});
	});
});
