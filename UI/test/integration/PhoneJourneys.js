/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

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
		"fss/ssp/test/integration/NavigationJourneyPhone",
		"fss/ssp/test/integration/NotFoundJourneyPhone",
		"fss/ssp/test/integration/BusyJourneyPhone"
	], function () {
		QUnit.start();
	});
});