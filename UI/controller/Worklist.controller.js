sap.ui.define([
  "fss/ssp/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/formatter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "fss/ssp/model/util",
  "sap/m/MessageBox",
  "fss/ssp/model/Constants"
], function(BaseController, JSONModel, formatter, Filter, FilterOperator, Sorter, util, MessageBox, Constants) {
  "use strict";

  /**
   * This controller manages document search and the display of the results.
   */
  return BaseController.extend("fss.ssp.controller.Worklist", {

    formatter: formatter,

    onInit: function() {
      // Model used to manipulate control states
      var oViewModel = new JSONModel({
        contractTableTitle: this.getResourceBundle().getText("contractTitle"),
        contractTableNoDataText: this.getResourceBundle().getText("contractListNoDataText"),
        poTableTitle: this.getResourceBundle().getText("poTitle"),
        poTableNoDataText: this.getResourceBundle().getText("poListNoDataText")
      });
      this.setModel(oViewModel, "worklistView");

      this.getRouter().attachRouteMatched(this._onRouteMatched, this);

      this.poColumnLi = this.byId("poColumnLi").clone();
      this.contractColumnLi = this.byId("contractColumnLi").clone();

      this.initSearchData = {
        Is_Contract: true,
        Is_PO: false
      };
      this.setModel(new JSONModel($.extend({}, this.initSearchData)), "searchModel");
      var keyCodes = sap.ui.requireSync("sap/ui/events/KeyCodes");
      this.byId("page").attachBrowserEvent("keydown", function(evt) {
          //add an event handler so that user can use ENTER to search
          if (evt.keyCode === keyCodes.ENTER) {
            this.onSearch();
          }
        }.bind(this));
      util.setDefaultPlacementTextVH(this.getView().getContent(), this);
    },

    /**
     * Binds the view to the object path and expands the aggregated line items. If this is on first load,
     * it binds the tables otherwise it performs a search.
     * @param {sap.ui.base.Event} oEvent pattern match event
     * @private
     */
    _onRouteMatched: function(oEvent){
      var sRouteName = oEvent.getParameters().name;
      if(sRouteName === "worklist"){
        this.setFLPTitle(this.getResourceBundle().getText("workListTitle"));
        this.getModel().metadataLoaded().then( function() {
          if(this.byId("poTable").getBinding("items")){
            this.onSearch(null, true);
          }
          else{
            this.bindPoTable();
            this.bindContractTable();
          }

        }.bind(this));
      }
    },

    onDraftSelect: function(oEvent){
      this.getModel("searchModel").setProperty("/CreatedByID", null);
      this.getModel("worklistView").setProperty("/CreatedByName", null);
    },
    // searchModel>/CreatedByID'}, {path: 'worklistView>/CreatedByName

    onValueHelpRequestAccountAssignment: function(oEvent) {
      var companyCode = this.getModel("searchModel").getProperty("/CompanyCode");

      var tempSource = oEvent.getSource();
      var searchPromise = jQuery.Deferred();

      if(!companyCode){
        // sap.m.MessageToast.show(
        //  this.getResourceBundle().getText("worklist.noCompamyCode.warning"));
        MessageBox.warning(
          this.getResourceBundle().getText("worklist.noCompamyCode.warning"),
          {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            styleClass: "sapUiSizeCompact",
            onClose: function(sAction) {
              if(sAction === MessageBox.Action.OK){
                searchPromise.resolve();
              }
              else{
                searchPromise.reject();
              }
            }.bind(this)
          }
        );
      }else{
        searchPromise.resolve();
      }
      // this.onValueHelpRequest(oEvent);

      searchPromise.then(function(){
          oEvent.oSource = tempSource;
          this.onValueHelpRequest(oEvent);
        }.bind(this),
        function(){
          searchPromise = null;
        });
    },

    /**
     * Binds PO table using filters provided
     * @param {array} filters list of filters t be applied
     */
    bindPoTable: function(filters){
      var oTable = this.byId("poTable");

      var oSorter = [new sap.ui.model.Sorter({
            path: "PONumber",
            descending: true
          })];
      if(oTable.getBinding("items") && oTable.getBinding("items").aSorters){
        oSorter = oTable.getBinding("items").aSorters;
      }
      oTable.unbindItems();
      oTable.bindItems({path: "/PurchaseOrders", template: this.poColumnLi,
          filters: filters ? filters : null,
          sorter: oSorter});
    },

    /**
     * Binds Contract table using filters provided
     * @param {array} filters list of filters t be applied
     */
    bindContractTable: function(filters){
      var oTable = this.byId("contractTable");
      var oSorter = [new sap.ui.model.Sorter({
            path: "ContractNumber",
            descending: true
          })];
      if(oTable.getBinding("items") && oTable.getBinding("items").aSorters){
        oSorter = oTable.getBinding("items").aSorters;
      }
      oTable.unbindItems();
      oTable.bindItems({path: "/Contracts", template: this.contractColumnLi,
          filters: filters ? filters : null,
          sorter: oSorter});
    },

    /**
     * Event handler for when twisty gets pressed. It toggles Expand for the line.
     * @param {sap.ui.base.Event} oEvent list of filters t be applied
     */
    onPoExpand: function(oEvent){
      var oSrc = oEvent.getSource();
      var oCtx = oSrc.getBindingContext();
      var sPath = oCtx.getPath();
      oSrc.getModel().setProperty(sPath + "/expand", !oSrc.getModel().getProperty(sPath + "/expand"));
    },

    /**
     * Event handler when a PO table item gets pressed. It navigates to corresponding PO
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onPoPress: function(oEvent) {
      oEvent.preventDefault();
      oEvent.cancelBubble();

      var obj = oEvent.getSource().getBindingContext().getObject();
      if(obj.IsSinglePO){
        this.onContractPress(oEvent);
      }
      else if(!obj.ContractNumber){//If PO does not have a contract
        this.getRouter().navTo("displayPoStandalone", {
          docId: oEvent.getSource().getBindingContext().getProperty("PONumber")
        });
      }
      else{
        this.getRouter().navTo("displayPo", {
          docId: oEvent.getSource().getBindingContext().getProperty("PONumber")
        });
      }
    },

    /**
     * Event handler when a PO table item's Edit pressed. It navigates to corresponding PO in Edit mode
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditPo: function(oEvent){
      var oCtx = oEvent.getSource().getBindingContext();
      var obj = oCtx.getObject();

      //this should never happen as we only enable the button after binding is completed.
      if (!obj) {
        return;
      }

      if(obj.IsSinglePO){
        this.onEditContract(oEvent);
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
        // if (obj.IsDraft) {
        //  sRouteName = "editPODraft";
        // } else {
        //  sRouteName = "editPODoc";
        // }

        if(!obj.ContractNumber){
          this.getRouter().navTo("editPOStandalone", {
            docId: obj.PONumber
          });
        }
        else{
          this.getRouter().navTo(sRouteName, {
            docId: obj.PONumber
          });
        }
      }.bind(this),
      function(){
        editPromise = null;
      });
    },

    // onCopyPo: function(oEvent) {
    //  oEvent.preventDefault();
    //  oEvent.cancelBubble();

    //  // if(obj.IsSinglePO){
    //  //  return;
    //  // }
    //  // else{
    //    this.getRouter().navTo("copyPODoc", {
    //      docId: oEvent.getSource().getBindingContext().getProperty("PONumber")
    //    });
    //  // }
    // },

    /**
     * Event handler when any Add option gets pressed. Using CustomData attached to the button, it determines the route.
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddAction: function(oEvent) {
      if (oEvent.getSource().data() && oEvent.getSource().data().Route) {
        this.getRouter().navTo(oEvent.getSource().data().Route, true);
      }

    },

    /**
     * Event handler when Add button gets pressed. It will open the Add dialog
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddClick: function(oEvent) {
      var oButton = oEvent.getSource();

      // create action sheet only once
      if (!this._actionSheet) {
        this._actionSheet = sap.ui.xmlfragment(
          "fss.ssp.view.fragments.AddActionSheet",
          this
        );
        this.getView().addDependent(this._actionSheet);
      }
      this._actionSheet.openBy(oButton);
    },

    /**
     * Event handler when a PO table's Add pressed. It navigates to corresponding Contract's Add view in Create mode
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onAddPo: function(oEvent){
      var obj = oEvent.getSource().getBindingContext().getObject();

      //this should never happen as we only enable the button after binding is completed.
      if (!obj) {
        return;
      }

      this.getRouter().navTo("createContractPO", {
        docId: obj.ContractNumber
      });
    },


    /**
     * Triggered by the table's 'updateFinished' event, after new table
     * data is available, this handler method updates the table counter.
     * @param {sap.ui.base.Event} oEvent the update finished event
     * @public
     */
    onContractUpdateFinished: function(oEvent) {
      // update the worklist's object counter after the table update
      var sTitle,
        oTable = oEvent.getSource(),
        iTotalItems = oEvent.getParameter("total");

      // only update the counter if the length is final and the table is not empty
      if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
        sTitle = this.getResourceBundle().getText("contractTitleCount", [iTotalItems]);
      } else {
        sTitle = this.getResourceBundle().getText("contractTitle");
      }
      this.getModel("worklistView").setProperty("/contractTableTitle", sTitle);
    },

    /**
     * Triggered by the table's 'updateFinished' event, after new table
     * data is available, this handler method updates the table counter.
     * @param {sap.ui.base.Event} oEvent the update finished event
     * @public
     */
    onPoUpdateFinished: function(oEvent) {
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
      this.getModel("worklistView").setProperty("/poTableTitle", sTitle);
    },

    /**
     * Event handler when a contract table item gets pressed. It navigates to that Contract in Display mode
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onContractPress: function(oEvent) {
      this.getRouter().navTo("displayContract", {
        docId: oEvent.getSource().getBindingContext().getProperty("ContractNumber")
      });
    },

    /**
     * Event handler when a Contract table's Edit pressed. It navigates to corresponding Contract in Edit mode
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onEditContract: function(oEvent){
      var oCtx = oEvent.getSource().getBindingContext();
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
        var sRouteName = "editDoc";
        // if (obj.IsDraft) {
        //  sRouteName = "editDraft";
        // } else {
        //  sRouteName = "editDoc";
        // }

        this.getRouter().navTo(sRouteName, {
          docId: obj.ContractNumber
        });
      }.bind(this),
      function(){
        editPromise = null;
      });
    },

    // onCopyContract: function(oEvent) {
    //  oEvent.preventDefault();
    //  oEvent.cancelBubble();

    //  this.getRouter().navTo("copyContractDoc", {
    //      docId: oEvent.getSource().getBindingContext().getProperty("ContractNumber")
    //    });
    // },

    /**
     * Event handler when a Contract item within PO table gets pressed. It navigates to corresponding Contract
     * @param {sap.ui.base.Event} oEvent the table selectionChange event
     * @public
     */
    onContractLinkPress: function(oEvent) {
      this.onContractPress(oEvent);
    },

    /**
     * Event handler when Sort button gets pressed for Contract table
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSortContract: function(oEvent) {
      var sTable = oEvent.getSource().data().table;

      if (!this.sortDialogContract) {
        this.sortDialogContract = sap.ui.xmlfragment(this.createId("sortDlgContract"), "fss.ssp.view.fragments.sortDlgContract", this);
        this.getView().addDependent(this.sortDialogContract);
      }
      if (oEvent.getSource().data().table) {
        this.sortDialogContract.addCustomData(new sap.ui.core.CustomData({
          key: "table",
          value: sTable
        }));
      }
      this.sortDialogContract.open();
    },

    /**
     * Event handler when Sort button gets pressed for PO table
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSortPo: function(oEvent) {
      var sTable = oEvent.getSource().data().table;

      if (!this.sortDialogPo) {
        this.sortDialogPo = sap.ui.xmlfragment(this.createId("sortDlgPo"), "fss.ssp.view.fragments.sortDlgPo", this);
        this.getView().addDependent(this.sortDialogPo);
      }
      if (oEvent.getSource().data().table) {
        this.sortDialogPo.addCustomData(new sap.ui.core.CustomData({
          key: "table",
          value: sTable
        }));
      }
      this.sortDialogPo.open();
    },

    /**
     * Event handler when sort's Ok button gets pressed. It will apply the selected sort config to corresponding table
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onSortDialogConfirm: function(oEvent) {
      var oTable = this.byId(oEvent.getSource().data().table),
        mParams = oEvent.getParameters(),
        oBinding = oTable.getBinding("items"),
        sPath,
        bDescending,
        aSorters = [];

      sPath = mParams.sortItem.getKey();
      bDescending = mParams.sortDescending;
      aSorters.push(new Sorter(sPath, bDescending));

      // apply the selected sort and group settings
      oBinding.sort(aSorters);
    },

    /**
     * Event handler when refresh button gets pressed for Contract table. It refreshes the binding
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onContractRefreshClick:function(oEvent){
      var oTable = util.getImmediateParentByType(oEvent.getSource(), "sap.m.Table");

      this.bindContractTable(oTable.getBindingInfo("items").filters);

      // oTable.getBinding("items").refresh(true);
    },

    /**
     * Event handler when refresh button gets pressed for PO table. It refreshes the binding
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onPoRefreshClick:function(oEvent){
      var oTable = util.getImmediateParentByType(oEvent.getSource(), "sap.m.Table");

      this.bindPoTable(oTable.getBindingInfo("items").filters);

      // oTable.getBinding("items").refresh(true);
    },

    /**
     * Event handler when Clear button gets pressed. It will reset the table's binding
     * @param {sap.ui.base.Event} oEvent the button press event
     * @public
     */
    onClear: function(oEvent) {
      var data = this.getModel("searchModel").getData();
      if (data.Is_Contract) {
        // this.byId("contractTable").getBinding("items").filter(aFilters, "Application");
        this.bindContractTable([]);
      }

      if (data.Is_PO) {
        //this.byId("poTable").getBinding("items").filter(aFilters, "Application");
        this.bindPoTable([]);
      }

      // var aFilters = [];
      // this.byId("contractTable").getBinding("items").filter(aFilters, "Application");
      // this.byId("poTable").getBinding("items").filter(aFilters, "Application");
      this.getModel("searchModel").setData($.extend({}, this.initSearchData));

      var vhControls = this.getView().getControlsByFieldGroupId(["WorklistVH"]);
      for (var i in vhControls) {
        if (vhControls[i] && vhControls[i].getFieldGroupIds().indexOf("WorklistVH") >= 0 ) {
          vhControls[i].fireChange({
            newValue: vhControls[i].getValue(),
            initialLoad: true
          });
        }
      }
    },

    /**
     * Event handler when Search button gets pressed. It will apply the filters to tables
     * @param {sap.ui.base.Event} oEvent the button press event
     * @param {boolean} ignoreMandatory Set to true if this is the initial search.
     * @public
     */
    onSearch: function(oEvent, ignoreMandatory) {
      if (!this.requiredControls) {
        this.requiredControls = [];
        util.getRequiredControls(this.byId("page").getContent(), this.requiredControls);
      }

      util.clearRequiredControls(this.requiredControls, this.getView());
      if (!util.checkRequiredControls(this.requiredControls, [], this.getView()) && !ignoreMandatory) {
        MessageBox.error(this.getResourceBundle().getText("requiredFieldsMsgBoxError"), {actions: [MessageBox.Action.OK]});
        return;
      }

      var to, sFilterFieldName, from;
      var searchModel = this.getModel("searchModel");
      var data = searchModel.getData();
      var aFilters = [];
      for (var sFilter in data) {

        if (sFilter.indexOf("Is_") > -1 || (!data[sFilter] && data[sFilter] !== false)) {
          continue;
        }
        if (sFilter.indexOf("_FROM") > -1) {
          to = sFilter.replace("_FROM", "_TO");
          sFilterFieldName = sFilter.replace("_FROM", "");
          if(data[sFilter] && data[to]){
            if(Number(data[sFilter]) > Number(data[to])){
              MessageBox.error(this.getResourceBundle().getText(sFilterFieldName) +
                      this.getResourceBundle().getText("fromMoreThanTo.error"), {actions: [MessageBox.Action.OK]});
              return;
            }
          }
          aFilters.push(new Filter(sFilterFieldName, FilterOperator.BT, data[sFilter] || null, data[to] || null));
        } else if (sFilter.indexOf("_TO") > -1) {
          from = sFilter.replace("_TO", "_FROM");
          sFilterFieldName = sFilter.replace("_TO", "");

          //if from field exists, this was handled by FROM above
          if(!data[from]){
            aFilters.push(new Filter(sFilterFieldName, FilterOperator.BT, data[from] || null, data[sFilter] || null));
          }
        } else {
          if(sFilter === "ContractNumber"){
            aFilters.push(new Filter(data.Is_PO ? "PONumber" : "ContractNumber", FilterOperator.Contains, data[sFilter]));
          }
          else{
            aFilters.push(new Filter(sFilter, FilterOperator.EQ, data[sFilter]));
          }

        }
      }

      // if(data.From_TotalValue || data.To_TotalValue){
      //  //if both exist, make sure FROM is smaller than TO
      //  if(data.From_TotalValue && data.To_TotalValue){
      //    if(Number(data.From_TotalValue) > Number(data.To_TotalValue)){
      //      MessageBox.error(this.getResourceBundle().getText("fromMoreThanTo.error"));
      //      return;
      //    }
      //  }
      //  aFilters.push(new Filter("TotalValue", FilterOperator.BT, data.From_TotalValue || undefined , data.To_TotalValue || undefined));
      // }

      if (data.Is_Contract) {
        // this.byId("contractTable").getBinding("items").filter(aFilters, "Application");
        this.bindContractTable(aFilters);
        this.getModel("worklistView").setProperty("/contractTableNoDataText", this.getResourceBundle().getText("noDataWithFilterOrSearchText"));
      }

      if (data.Is_PO) {
        //this.byId("poTable").getBinding("items").filter(aFilters, "Application");
        this.bindPoTable(aFilters);
        this.getModel("worklistView").setProperty("/poTableNoDataText", this.getResourceBundle().getText("noDataWithFilterOrSearchText"));
      }

    }
  });
});