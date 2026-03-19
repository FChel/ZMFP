sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "fss/ssp/localService/mockserver",
    "fss/ssp/model/util",
    "sap/ui/core/IconPool",
    "fss/ssp/model/Constants",
    "sap/base/security/URLWhitelist"

  ], function (UIComponent, MessageBox, JSONModel, mockserver, util, IconPool, Constants, URLWhitelist) {
    "use strict";

    return UIComponent.extend("fss.ssp.Component", {

      metadata : {
        manifest : "json",
        config: { fullWidth: false },
        services :{
          ShellUIService: {
            factoryName: "sap.ushell.ui5service.ShellUIService"
          }
        }
      },

      setDisableModel: function(){
        if(sap.ui.getCore().getModel("disableModel")){
          this.setModel(sap.ui.getCore().getModel("disableModel"), "disableModel");
          return;
        }

        var oModel = this.getModel("searchHelpModel")
        if (!oModel) {
          oModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZEDM_SEARCHHELP_SRV", {
            useBatch: false,
            defaultCountMode: sap.ui.model.odata.CountMode.Inline
          });
        }
        oModel.metadataLoaded().then(function() {
          var aFilters = [];
          aFilters.push(new sap.ui.model.Filter("DataType", sap.ui.model.FilterOperator.EQ, "DisableFlag"));
          aFilters = [new sap.ui.model.Filter({
            filters: aFilters,
            and: false
          })];

          var mParameters = {
            method: "GET",
            filters: aFilters,
            success: function(oData) {
              var obj = oData.results;
              var bFlag = false;
              var sText = "", sTitle = "";

              for (var i in obj) {
                if (obj[i].DataType === "DisableFlag") {
                  if(obj[i].Key === "MyFiDisabled"){
                    bFlag = [true, "True", "true", "TRUE"].indexOf(obj[i].Value) > -1 ;
                  }
                  if(obj[i].Key === "DisabledText"){
                    sText = obj[i].Value;
                  }
                  if(obj[i].Key === "DisabledTitle"){
                    sTitle = obj[i].Value;
                  }
                }
              }
              this.setModel(new sap.ui.model.json.JSONModel({DisableFlag: bFlag, DisableText: sText}), "disableModel");
            }.bind(this)
          };
          oModel.read("/RefDataSet", mParameters);
        }.bind(this));
      },

      /**
       * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
       * In this method, the device models are set and the router is initialized.
       * @public
       * @override
       */
      init : function () {
        this.setDisableModel();

        URLWhitelist.add("mailto");
        jQuery.sap.addUrlWhitelist(undefined, "modelpedia.dpe.protected.mil.au");
        jQuery.sap.addUrlWhitelist(undefined, "drnet.defence.gov.au");
        jQuery.sap.addUrlWhitelist(undefined, "idmportal.defence.gov.au");
        jQuery.sap.addUrlWhitelist(undefined, "drnet.defence.gov.au");
        jQuery.sap.addUrlWhitelist(undefined, "objective");
        // call the base component's init function and create the App view
        UIComponent.prototype.init.apply(this, arguments);

        // set the device model
        var deviceModel = util.createDeviceModel();
        this.setModel(deviceModel, "device");
        var deviceData = deviceModel.getData();

        this.setModel(new JSONModel({}), "ValueHelpModel");

        //Import polyfill library for IE
        if(deviceData.browser.name === deviceData.browser.BROWSER.INTERNET_EXPLORER){
          sap.ui.require(["fss/ssp/library/polyfill.min"]);
        }

        // create the views based on the url/hash
        this.getRouter().initialize();
        // var dropDownModel = new JSONModel();
        // dropDownModel.setSizeLimit(1000);
        // this.setModel(dropDownModel, "dropDownModel");
        // this.dropDownPromise = null;
        util.loadDropDowns(this);

        var userModel = new JSONModel();
        this.setModel(userModel, "userModel");
        this.loadUser();
        this.vhDialogs = {};
        if(!util.initialiseVHConfig.apply(this)){
          this.getModel("vhConfigModel").attachRequestCompleted(util.initialiseVHConfig.bind(this));
        }

        this.filterDialogs = {};
        if(!util.initialiseFilterConfig.apply(this)){
          this.getModel("filterConfigModel").attachRequestCompleted(util.initialiseFilterConfig.bind(this));
        }

        var sModelPath = $.sap.getModulePath("fss.ssp");
        jQuery.sap.includeStyleSheet(sModelPath + "/css/style.css");
        this.initIcons();
        // this.setModel(new JSONModel({isSsp: true}), "sspIndicatorModel");

        // metadata failed, ********this was moved to App.controller******
        // this.metadataFailed().then(function() {
        //  var sText = this.getModel("i18n").getResourceBundle().getText("noAuth.error");
        //  var oFormattedText = new FormattedText("", { htmlText: sText });

        //  MessageBox.show(oFormattedText, {
        //      title: this.getModel("i18n").getResourceBundle().getText("noAuth.title"),
        //      initialFocus: null
        //    });
        // }.bind(this));

        // in FLP (FIORI launchpad)
        var bInFLP = false;
        if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
          bInFLP = true;
        }

        // component Model
        var oComponentModel = new JSONModel({
          inFLP: bInFLP
        });
        this.setModel(oComponentModel, "componentModel");
      },

      initIcons: function(){
        IconPool.registerFont({
          fontFamily: "BusinessSuiteInAppSymbols",
          fontURI: sap.ui.require.toUrl("sap/ushell/themes/base/fonts/")
          });
        IconPool.registerFont({
          fontFamily: "SAP-icons-TNT",
          fontURI: sap.ui.require.toUrl("sap/tnt/themes/base/fonts/")
          });

      },

      loadUser: function(){
        if(!this._oUserPromise){
          this._oUserPromise =  new Promise(function(fResolve) {
            this.getModel("searchHelpModel").metadataLoaded().then( function() {
              var sUserPath = this.getModel("searchHelpModel").createKey("Users", {
                UserId: Constants.DEFAULT_USER_ID
              });
              var mParameters = {
                method: "GET",
                success: function(oData){
                  this.getModel("userModel").setData(oData);

                  fResolve(oData);
                }.bind(this),
                error: function(oError) {
                  var aErrors = util.processODataError(oError, this.getResourceBundle());

                  MessageBox.error(this.getResourceBundle().getText("userRead.error", [aErrors[0].message]));
                  fResolve(null);
                }.bind(this)
                  };

              this.getModel("searchHelpModel").read(
                        "/" + sUserPath,
                         mParameters);
            }.bind(this));
          }.bind(this));
        }
        return this._oUserPromise;

      },

      getResourceBundle : function () {
        return this.getModel("i18n").getResourceBundle();
      },

      /**
       * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
       * design mode class should be set, which influences the size appearance of some controls.
       * @public
       * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
       */
      getContentDensityClass : function() {
        if (this._sContentDensityClass === undefined) {
          // check whether FLP has already set the content density class; do nothing in this case
          if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
            this._sContentDensityClass = "";
          }
          else if (!this.getModel("device").getData().support.touch) { // apply "compact" mode if touch is not supported
            this._sContentDensityClass = "sapUiSizeCompact";
          }
          else {
            // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
            this._sContentDensityClass = "sapUiSizeCozy";
          }
        }
        return this._sContentDensityClass;
      },

      getMockServer: function(){
        return mockserver.getMockServer();
      },
      /**

      * return metadataFailed promise (workaround because there isn't a standard one)

      */

      metadataFailed : function() {
        var oModel = this.getModel();
        if (oModel.isMetadataLoadingFailed()) {
          return Promise.resolve();
        } else {
          return new Promise(function(resolve) {
            oModel.attachEventOnce("metadataFailed", resolve);
            });
        }
      },

    });

  }
);