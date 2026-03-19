/**
 * This controller manages the Consumption's view and its related event handlers.
 */
sap.ui.define([
  "fss/ssp/controller/BaseController",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "fss/ssp/model/util",
  "fss/ssp/model/formatter",
  "sap/ui/model/Sorter"

], function(BaseController, Filter, FilterOperator,JSONModel, util, formatter, Sorter) {
  "use strict";

  /**
   * This controller manages Change Log view and its event handlers.
   */
  return BaseController.extend("fss.ssp.controller.ChangeLog", {
    formatter : formatter,

    onInit: function() {
      this.mainModel = this.getOwnerComponent().getModel("ssp") || this.getOwnerComponent().getModel();
      this.setModel(this.mainModel);
      sap.ui.getCore().getEventBus().subscribe("bindView", "bindView", this.onBindView, this);
      this.changeTable = this.byId("changeTable");
    },

    onBindView: function(sChannel, sEvent, oData){
      this.getView().setModel(new JSONModel({}), "dropDownModel");
      if(!oData.docId || !oData.docPath){
        return;//No doc number passed, return back
      }

      if(!this.changeTemplate){
        this.changeTemplate = this.byId("changeItem").clone();
      }

      this.changeTable.setBusy(true);
      this.changeTable.bindItems({path: "/" + oData.docPath + "/ChangeLogs", template: this.changeTemplate,
            sorter: [new sap.ui.model.Sorter({
              path: "ChangeDate",
              descending: true
            })],
            events:{
              dataReceived: function(oEvent){
                this.changeTable.setBusy(false);
                var oLogData = oEvent.getParameter("data");
                this.extractFilterData(oLogData.results);
              }.bind(this)
            }});
    },

    extractFilterData: function(aLogData){
      if(this.getModel("dropDownModel") && this.getModel("dropDownModel").getData() && this.getModel("dropDownModel").getData().Users){
        return;
      }
      var oUsers = {}, oFields = {}, oLineItems = {};
      var oDropdownData = {};
      for(var i in aLogData){
        if(aLogData[i].UserId){
          oUsers[aLogData[i].UserId] = aLogData[i].UserName;
        }
        if(aLogData[i].FieldName){
          oFields[aLogData[i].FieldName] = aLogData[i].FieldText;
        }
        if(aLogData[i].LineItem && formatter.lineNumberFormatter(aLogData[i].LineItem)){
          oLineItems[aLogData[i].LineItem] = formatter.lineNumberFormatter(aLogData[i].LineItem);
        }
      }
      oDropdownData.Users = [{key: "", value: ""}];
      for(i in oUsers){
        oDropdownData.Users.push({key: i, value: oUsers[i]});
      }

      oDropdownData.Fields = [{key: "", value: ""}];
      for(i in oFields){
        oDropdownData.Fields.push({key: i, value: oFields[i]});
      }

      oDropdownData.LineItems = [{key: "", value: ""}];
      for(i in oLineItems){
        oDropdownData.LineItems.push({key: i, value: oLineItems[i]});
      }
      this.getView().setModel(new JSONModel(oDropdownData), "dropDownModel");

    },

    onSortClick: function(oEvent) {
      if (!this.sortDialog) {
        this.sortDialog = sap.ui.xmlfragment(this.createId("changeLogSort"), "fss.ssp.view.fragments.changeLogSort", this);
        this.getView().addDependent(this.sortDialog);
      }

      this.sortDialog.addCustomData(new sap.ui.core.CustomData({
        key: "table",
        value: "changeTable"
      }));

      this.sortDialog.open();
    },

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

      if(sPath === "ChangeDate"){
        aSorters.push(new Sorter("ChangeTime", bDescending));
      }

      // apply the selected sort and group settings
      oBinding.sort(aSorters);
    },







  });

});