sap.ui.define([
  "fss/ssp/controller/BaseController",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/util",
  "fss/ssp/model/formatter",
  "sap/m/MessageBox",
  "fss/ssp/model/Constants",
  "sap/ui/export/Spreadsheet",
  "sap/ui/export/library",
  "../library/xlsx.mini",
  "sap/ui/model/Sorter"

], function(BaseController, Filter, FilterOperator,JSONModel, util, formatter, MessageBox, Constants, Spreadsheet, expLib, xlsx, Sorter) {
  "use strict";
  var EdmType = expLib.EdmType;
  /**
   * This controller manages the functionalities for PO table within PO tab in contracts
   */
  return BaseController.extend("fss.ssp.controller.ContractPoTable", {
    formatter : formatter,
    onInit: function(oEvent){
      this.reportDlgId = "reportDlg";
      this.reportFragment = "fss.ssp.view.fragments.oaReport";
      this.setModel(new JSONModel({}), "poViewModel");
      this.ContractPoColumnLi = this.byId("ContractPoColumnLi").clone();
      // this.getModel("poViewModel").setProperty("/poTableTitle", this.getResourceBundle().getText("poTitle"));
    },

    /**
     * Event handler when POs table update is finished. It updates table's header
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onUpdateFinished: function(oEvent) {
      // update the worklist's object counter after the table update
      var sTitle,
        oTable = oEvent.getSource(),
        iTotalItems = oEvent.getParameter("total");

      // only update the counter if the length is final and the table is not empty
      if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
        sTitle = this.getResourceBundle().getText("poTitleCount", [iTotalItems]);
      } else {
        sTitle = this.getResourceBundle().getText("poTitle");
      }
      this.getModel("poViewModel").setProperty("/poTableTitle", sTitle);


      var aItems = oTable.getItems();
      for(var i in aItems){
        if(!aItems[0].getBindingContext("PoTabModel") ||
            aItems[0].getBindingContext("PoTabModel").getObject().Currency !== aItems[i].getBindingContext("PoTabModel").getObject().Currency){
          this.getModel("poViewModel").setProperty("/Currency", "xxx");
          break;
        }
        else{
          this.getModel("poViewModel").setProperty("/Currency", aItems[0].getBindingContext("PoTabModel").getObject().Currency);
        }
      }
      // this.getModel("viewModel").setProperty("/poTableTitle", sTitle);
      // this.byId("poTitle").setText(sTitle);
    },

    /**
     * Event handler when Edit button gets pressed for a PO. It navigates to that PO's edit view.
     * If status is awaiting approval, it will show a warning for Recall.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditPo: function(oEvent){
      var oCtx = oEvent.getSource().getBindingContext("PoTabModel") ? oEvent.getSource().getBindingContext("PoTabModel") :
              oEvent.getSource().getBindingContext();
      var obj = oCtx.getObject();

      //this should never happen as we only enable the button after binding is completed.
      if (!obj) {
        return;
      }

      var editPromise = jQuery.Deferred();

      if([Constants.STATUS_AWAITING_PRF, Constants.STATUS_AWAITING_APPROVAL, Constants.STATUS_AWAITING_ASSET].indexOf(obj.Status) >= 0 && !obj.IsLegacy){
        MessageBox.warning(
          this.getResourceBundle().getText("dlg.recall.warning"),
          {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            styleClass: "sapUiSizeCompact",
            onClose: function(sAction) {
              if(sAction === MessageBox.Action.OK){
                editPromise.resolve();
              }
              else{
                editPromise.reject();
              }
            }.bind(this)
          }
        );
      }else{
        editPromise.resolve();
      }

      editPromise.then(function(){
        var sRouteName = "editPODoc";

        this.getRouter().navTo(sRouteName, {
          docId: obj.ParentNumber || obj.PONumber
        });
      }.bind(this),
      function(){
        editPromise = null;
      });
    },

    onOaReport: function(oEvent){
      if (!this.reportDlg) {
        this.reportDlg = sap.ui.xmlfragment(this.createId(this.reportDlgId), this.reportFragment, this);
        this.reportDlg.setModel(new JSONModel({}));
        this.getView().addDependent(this.reportDlg);
      }
      var viewModelData = {};
      var oViewModel = new JSONModel($.extend(viewModelData, this.getModel("viewModel").getData()));
      this.reportDlg.setModel(oViewModel, "viewModel");
      oViewModel.setProperty("/busy", true);

      var mParameters = {
        method: "GET",
        filters: [new Filter("ContractNumber", FilterOperator.EQ, this.getView().getBindingContext().getObject().ContractNumber)],
        success: function(oData) {
          oViewModel.setProperty("/busy", false);
          for(var i in oData.results){
            if(!oData.results[i].PoNumber || !Number(oData.results[i].PoNumber)){
              oData.results[i].PoNumber = "";
            }
            if(!oData.results[i].PoLi || !Number(oData.results[i].PoLi)){
              oData.results[i].PoLi = "";
            }

          }
          this.sortReport(oData.results);
          this.reportDlg.getModel().setData(oData.results);
          this.reportDlg.getModel().updateBindings();

        }.bind(this),
        error: function(oError) {
          oViewModel.setProperty("/busy", false);

          var aErrors = util.processODataError(oError, this.getResourceBundle());
          this.getModel("ErrorModel").setProperty("/errors", aErrors);
          var errorBtn = this.getById("errorBtn");
          this.showErrorPopover(errorBtn);

        }.bind(this)
      };
      var sPath = "/ContractConsumptions";
      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();
      this.mainModel.read(sPath, mParameters);

      if(!this.sContractNumberLength){
        var sItemEntity = "ContractConsumption";
        this.mainModel.metadataLoaded().then(function() {
          this.sContractNumberLength = util.getOdataPropertyLength(this.mainModel, sItemEntity, "ContractNumber");
          this.sContractLiLength = util.getOdataPropertyLength(this.mainModel, sItemEntity, "ContractLi");
          this.sPoNumberLength = util.getOdataPropertyLength(this.mainModel, sItemEntity, "PoNumber");
          this.sPoLiLength = util.getOdataPropertyLength(this.mainModel, sItemEntity, "PoLi");
          this.sCurrencyLength = util.getOdataPropertyLength(this.mainModel, sItemEntity, "Currency");
        }.bind(this));
      }

      this.reportDlg.open();
    },

    onPoExpand: function(oEvent){
      var oSrc = oEvent.getSource();
      var oCtx = oSrc.getBindingContext();
      var sPath = oCtx.getPath();
      var obj = oCtx.getObject();

      if(!obj.expand){
        //get immediate parent ColumnListItem, get immediate child Table, set filter
        var oColListItem = util.getImmediateParentByType(oEvent.getSource(), "sap.m.ColumnListItem");
        if(!oColListItem){
          return;
        }
        var oConTable = util.getImmediateChildByType(oColListItem, "sap.m.Table");
        if(!oConTable){
          return;
        }

        oConTable.getBinding("items").filter(new Filter({filters: [new Filter("PoNumber", FilterOperator.NE, ""),
                          new Filter("ContractLi", FilterOperator.EQ, obj.ContractLi)],
                          and:true}));
      }

      oSrc.getModel().setProperty(sPath + "/expand", !obj.expand);
    },

    sortReport: function(oData){
      oData.sort(function(a,b){
          if(a.ContractLi < b.ContractLi){
            return -1;
          }
          else if(a.ContractLi > b.ContractLi){
            return 1;
          }
          else if(a.PoNumber < b.PoNumber){
            return -1;
          }
          else if(a.PoNumber > b.PoNumber){
            return 1;
          }
          else if(a.PoLi < b.PoLi){
            return -1;
          }
          else if(a.PoLi > b.PoLi){
            return 1;
          }
        });
    },

    onDownload: function() {
      var aColumns = [];
      aColumns.push({ label: "OA Number", property: "ContractNumber", type: EdmType.Number, width: this.sContractNumberLength});
      aColumns.push({ label: "OA Line", property: "ContractLi", type: EdmType.Number, width: this.sContractLiLength});
      aColumns.push({ label: "PO Number", property: "PoNumber", type: EdmType.Number, width: this.sPoNumberLength});
      aColumns.push({ label: "PO Line", property: "PoLi", type: EdmType.Number, width: this.sPoLiLength});
      aColumns.push({ label: this.getResourceBundle().getText("reportTable.Currency"), type: EdmType.String, property: "Currency", width: this.sCurrencyLength });
      aColumns.push({ label: this.getResourceBundle().getText("reportTable.OALineValue"), property: "NetPrice",
              type: EdmType.Currency, unitProperty: "Currency", displayUnit: false, delimiter: false});
      aColumns.push({ label: this.getResourceBundle().getText("reportTable.TotalAssigned"), property: "TotalAssigned",
              type: EdmType.Currency, unitProperty: "Currency", displayUnit: false, delimiter: false});
      aColumns.push({ label: this.getResourceBundle().getText("reportTable.UnassignedValue"), property: "TotalUnassigned",
              type: EdmType.Currency, unitProperty: "Currency", displayUnit: false, delimiter: false});

      var sFileName = this.getResourceBundle().getText("OaToPoReport.title");

      var oModel = this.reportDlg.getModel();
      var aItems = oModel.getData();
      if(aItems.length === 0){
        aItems.push({});
      }

      var oSettings = {
        workbook: {
          columns: aColumns,
          context: {
            sheetName: this.getResourceBundle().getText("reportTable.LineItemsSummary")
          }
        },
        dataSource: aItems,
        count: aItems.length,
        fileName: sFileName
      };

      var oSheet = new Spreadsheet(oSettings);
      oSheet.build().then( function() {
        var sMessage = "Report successfully downloaded.";
        sap.m.MessageToast.show(sMessage);
      }).finally(
        oSheet.destroy
        );


      // jQuery.sap.require("sap.ui.core.util.Export");
      // jQuery.sap.require("sap.ui.core.util.ExportTypeCSV");


      // var oExport = new sap.ui.core.util.Export({
      //  exportType: new sap.ui.core.util.ExportTypeCSV({
      //    fileExtension: "csv",
      //    separatorChar: ",",
      //    mimeType: "text/csv",
      //    charset: "utf-8"
      //  }),
      //  models: oModel,
      //  rows: {
      //    path: sPath
      //  },
      //  columns: [{
      //      name: "Contract Number", template: { content: "{path: 'ContractNumber'}"}
      //    },{
      //      name: "Contract Line", template: { content: "{path: 'ContractLi'}"}
      //    },{
      //      name: "PO Number", template: { content: "{path: 'PoNumber'}"}
      //    },{
      //      name: "PO Line", template: { content: "{path: 'PoLi'}"}
      //    },{
      //      name: this.getResourceBundle().getText("reportTable.Currency"), template: { content: "{path: 'Currency'}"}
      //    },{
      //      name: this.getResourceBundle().getText("reportTable.OALineValue"),
                // template: { content: "{parts: [{path: 'NetPrice'}, {path:'Currency'}], type:'fss.ssp.CustomTypes.CustomCurrency', formatOptions:{showMeasure: false}, constraints:{minimum: 0}}" }
      //    },{
      //      name: this.getResourceBundle().getText("reportTable.TotalAssigned"),
                // template: { content: "{parts: [{path: 'TotalAssigned'}, {path:'Currency'}], type:'fss.ssp.CustomTypes.CustomCurrency', formatOptions:{showMeasure: false}, constraints:{minimum: 0}}" }
      //    },{
      //      name: this.getResourceBundle().getText("reportTable.UnassignedValue"),
                // template: { content: "{parts: [{path: 'TotalUnassigned'}, {path:'Currency'}], type:'fss.ssp.CustomTypes.CustomCurrency', formatOptions:{showMeasure: false}, constraints:{minimum: 0}}" }
      //    }
      //    ]
      // });

      // // download exported file
      // var bErr = false;
      // oExport.saveFile("Report").catch(function(oError) {
      //  bErr = true;
      //  sap.m.MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
      // }).then(function() {
      //  oExport.destroy();
      //  if (! bErr) {
      //    var sMessage = "Report successfully downloaded.";

      //    sap.m.MessageToast.show(sMessage +=
      //      "\n\nLink to downloaded file may be displayed on the navigation toolbar at the bottom of your screen (depending on your browser).", {
      //      duration: 5000,
      //      width: "30em",
      //      my: sap.ui.core.Popup.Dock.CenterCenter,
      //      at: sap.ui.core.Popup.Dock.CenterCenter
      //    });
      //  }
      // });
    },

    onReportCancel: function(oEvent){
      if(this.reportDlg){
        this.reportDlg.close();
      }
    },

    // onBeforeRendering: function(oEvent){
    //  //component is not inherited for nested view in tables. Need to inject it manually
    //  if(!this.getOwnerComponent()){
    //    var oParent = util.getImmediateParentByType(this.getView(), "sap.ui.core.mvc.XMLView", 12);
    //    if(oParent){
    //      this.getView()._sOwnerId = oParent._sOwnerId;
    //    }
    //  }

    //  var oTable = this.byId("contractPoTable");
    //  if(oTable.getBinding("items")){
    //    oTable.getBinding("items").refresh();
    //  }
    //  else{
    //    oTable.bindItems({path: "PurchaseOrders", template: this.ContractPoColumnLi,
    //        templateShareable: false,
    //        sorter: [new sap.ui.model.Sorter({
    //          path: "ParentNumber",
    //          descending: true
    //        })]});
    //  }
    // },

    /**
     * Event handler when Add button gets pressed for PO table. It navigates to Create PO view of the corresponding Contract.
     * If status is not Approved, it will show a warning that PO can only be saved as a draft.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddPo: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();

      //this should never happen as we only enable the button after binding is completed.
      if (!obj){
        return;
      }

      var addPromise = jQuery.Deferred();

      if(obj.Status !== Constants.STATUS_APPROVED){
        MessageBox.warning(
          this.getResourceBundle().getText("dlg.nonApproved.warning"),
          {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            styleClass: "sapUiSizeCompact",
            onClose: function(sAction) {
              if(sAction === MessageBox.Action.OK){
                addPromise.resolve();
              }
              else{
                addPromise.reject();
              }
            }.bind(this)
          }
        );
      }else{
        addPromise.resolve();
      }

      addPromise.then(function(){
        var oViewModel = this.getModel("viewModel");
        var oRouter = this.getRouter();
        if(oViewModel && (oViewModel.getProperty("/displayMode") || oViewModel.getProperty("/editMode"))){
          var sUrl;
          var bFLP = this.getOwnerComponent().getModel("componentModel").getProperty("/inFLP");
          if (bFLP === true) {
            this.getOwnerComponent().getService("ShellUIService").then(function(oShellService) {
              sUrl = sap.ushell.Container.getService("CrossApplicationNavigation").hrefForAppSpecificHash(this.getRouter().getRoute("createContractPO").getURL(
                                                                                {docId: obj.ContractNumber}));

              sap.m.URLHelper.redirect( sUrl, true);
            }.bind(this));
          }
          else{
            sUrl = oRouter.getRoute("createContractPO").getURL({docId: obj.ContractNumber});
            sap.m.URLHelper.redirect("#/" + sUrl, true);
          }
        }
        else{
          oRouter.navTo("createContractPO", {
            docId: obj.ContractNumber
          });
        }
      }.bind(this),
      function(){
        addPromise = null;
      });
    },

    /**
     * Event handler when a PO table item gets pressed. It navigates to corresponding PO
     * @param {sap.ui.base.Event} oEvent the table selectionChange event
     * @public
     */
    onPoPress: function(oEvent) {
      oEvent.preventDefault();
      oEvent.cancelBubble();
      var oCtx = oEvent.getSource().getBindingContext("PoTabModel") ? oEvent.getSource().getBindingContext("PoTabModel") :
              oEvent.getSource().getBindingContext();
      var obj = oCtx.getObject();
      this.getRouter().navTo("displayPo", {
        docId: obj.ParentNumber || obj.PONumber
      });
    },

    // onCopyPo: function(oEvent){
    //  oEvent.preventDefault();
    //  oEvent.cancelBubble();
    //  var oCtx = oEvent.getSource().getBindingContext("PoTabModel") ? oEvent.getSource().getBindingContext("PoTabModel") :
    //          oEvent.getSource().getBindingContext();
    //  var obj = oCtx.getObject();
    //  this.getRouter().navTo("copyPODoc", {
    //    docId: obj.ParentNumber || obj.PONumber
    //  });
    // }

    // onMore: function(oEvent){
    //  var oButton = oEvent.getSource();

    //  // create action sheet only once
    //  if (!this._moreActionSheet) {
    //    this._moreActionSheet = sap.ui.xmlfragment(
    //      "fss.ssp.view.fragments.displayContractPoMoreAction",
    //      this
    //    );
    //    this.getView().addDependent(this._moreActionSheet);
    //  }
    //  this._moreActionSheet.setBindingContext(oButton.getBindingContext());

    //  this._moreActionSheet.openBy(oButton);
    // },



  });

});