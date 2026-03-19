/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 Contracts in the list
// * All 3 Contracts have at least one ContractLIs

sap.ui.require([
	"sap/ui/test/Opa5",
	"fss/ssp/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"fss/ssp/test/integration/pages/App",
	"fss/ssp/test/integration/pages/Browser",
	"fss/ssp/test/integration/pages/Master",
	"fss/ssp/test/integration/pages/Detail",
	"fss/ssp/test/integration/pages/NotFound"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "fss.ssp.view."
	});

	sap.ui.require([
		"fss/ssp/test/integration/MasterJourney",
		"fss/ssp/test/integration/NavigationJourney",
		"fss/ssp/test/integration/NotFoundJourney",
		"fss/ssp/test/integration/BusyJourney"
	], function () {
		QUnit.start();
	});
});