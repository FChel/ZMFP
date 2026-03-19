sap.ui.define([
  "sap/ui/core/theming/Parameters",
  "sap/ui/core/library",
], function(ThemingParameters, sapCoreLib) {
  "use strict";

  const OpenState = sapCoreLib.OpenState;
  const backgroundColor = ThemingParameters.get("sapUiGroupContentBackground");
  // Since 1.88, Parameters.get supports also async retrieval. See API ref.

  return {
    apiVersion: 2,
    render: function(renderManager, control) {
      // Issue: render function is called twice.
      // See https://github.com/SAP/openui5/issues/3169
      // Update: fixed.
      /**
       * If the fix is not included in your target UI5 version wrap with:
       * <code>if (typeof control._getPopup == "function" && control._getPopup().isA("sap.ui.core.Popup") && control._getPopup().getOpenState() == OpenState.OPENING) { ... }</code> before actually rendering. */

      renderManager.openStart("div", control)
        .style("max-width", control.getMaxWidth())
        .style("height", control.getHeight())
        .style("width", control.getWidth())
        .style("background-color", backgroundColor)
        .openEnd()
        .renderControl(control.getAggregation("content"))
        .close("div");
    },
  };
});