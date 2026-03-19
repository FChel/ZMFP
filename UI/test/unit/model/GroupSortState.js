/*global QUnit*/

sap.ui.define([
	"fss/ssp/model/GroupSortState",
	"sap/ui/model/json/JSONModel"
], function (GroupSortState, JSONModel) {
	"use strict";

	QUnit.module("GroupSortState - grouping and sorting", {
		beforeEach: function () {
			this.oModel = new JSONModel({});
			// System under test
			this.oGroupSortState = new GroupSortState(this.oModel, function() {});
		}
	});

	QUnit.test("Should always return a sorter when sorting", function (assert) {
		// Act + Assert
		assert.strictEqual(this.oGroupSortState.sort("TotalValue").length, 1, "The sorting by TotalValue returned a sorter");
		assert.strictEqual(this.oGroupSortState.sort("ContractNumber").length, 1, "The sorting by ContractNumber returned a sorter");
	});

	QUnit.test("Should return a grouper when grouping", function (assert) {
		// Act + Assert
		assert.strictEqual(this.oGroupSortState.group("TotalValue").length, 1, "The group by TotalValue returned a sorter");
		assert.strictEqual(this.oGroupSortState.group("None").length, 0, "The sorting by None returned no sorter");
	});


	QUnit.test("Should set the sorting to TotalValue if the user groupes by TotalValue", function (assert) {
		// Act + Assert
		this.oGroupSortState.group("TotalValue");
		assert.strictEqual(this.oModel.getProperty("/sortBy"), "TotalValue", "The sorting is the same as the grouping");
	});

	QUnit.test("Should set the grouping to None if the user sorts by ContractNumber and there was a grouping before", function (assert) {
		// Arrange
		this.oModel.setProperty("/groupBy", "TotalValue");

		this.oGroupSortState.sort("ContractNumber");

		// Assert
		assert.strictEqual(this.oModel.getProperty("/groupBy"), "None", "The grouping got reset");
	});
});