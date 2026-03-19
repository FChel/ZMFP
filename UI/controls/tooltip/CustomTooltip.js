sap.ui.define([
  "sap/ui/core/TooltipBase",
  "./CustomTooltipRenderer"
], function(TooltipBase, CustomTooltipRenderer) {
  "use strict";

  
  return TooltipBase.extend("fss.ssp.controls.tooltip.CustomTooltip", {
	// renderer: CustomTooltipRenderer,
    metadata: {
      properties: {
        "maxWidth": {
          type: "sap.ui.core.CSSSize",
          defaultValue: "20rem"
        },
        "height": {
          type: "sap.ui.core.CSSSize",
          defaultValue: "auto"
        },
        "width": {
          type: "sap.ui.core.CSSSize",
          defaultValue: "auto"
        }
        // ... and other properties inherited from TooltipBase
      },
      defaultAggregation: "content",
      aggregations: {
        "content": {
          type: "sap.ui.core.Control",
          multiple: false,
          bindable: true
        }
      }
    },

    // Issue: these two hooks are called twice.
    // See https://github.com/SAP/openui5/issues/3168
    onlocalizationChanged: function() {
	
    },
    onThemeChanged: function() {
	
    }


  });
});