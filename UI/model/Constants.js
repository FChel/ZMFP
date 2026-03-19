sap.ui.define([],
  /**
   * This function holds the Constant values for the app.
   */
  function() {
    return {
      STATUS_LI_DELETED: "L",
      STATUS_LI_LOCKED: "S",
      STATUS_LI_DRAFT: "D",
      STATUS_LI_NONE: "",
      USER_ACTION_DRAFT: "10",
      USER_ACTION_REASSIGN: "20",
      USER_ACTION_UNASSIGN: "22",
      USER_ACTION_DUPLICATE: "25",
      USER_ACTION_VALIDATE: "30",
      USER_ACTION_SUBMIT: "40",
      USER_ACTION_CLOSE_DOC: "60",
      USER_ACTION_EDIT_READ: "80",
      STATUS_DRAFT: "10",
      STATUS_AWAITING_APPROVAL: "30",
      STATUS_APPROVED: "40",
      STATUS_AWAITING_PRF: "20",
      STATUS_AWAITING_ASSET: "25",
      STATUS_RECALLED: "35",
      STATUS_NEW: "NN",
      STATUS_REJECTED: "99",
      STATUS_FAILED: "96",
      STATUS_DELETED: "dd",
      STATUS_NEW_DESC: "New",
      DEFAULT_USER_ID: "XXXX",
      DELIVERY_DATE_FUTURE_YEARS: 1,
      MATERIAL_GROUP_DEFAULT_SERVICE: "GEN SVC",
      MATERIAL_GROUP_DEFAULT_GOODS: "OTHERITEM",
      MATERIAL_GROUP_DEFAULT: "",
      ORDER_UNIT_DEFAULT: "",
      MANDATORY_DELEGATE_ERROR_CODE: "ZMFP/100",
      LEGACY_DISPLAY_ERROR_CODE: "ZMFP/030",
      LEGACY_EDIT_ERROR_CODE: "ZMFP/031",
      ADDRESS_TYPES: [{key: "RomanCode", value: "AddressRoman"}, {key: "NewAddress", value: "NewAddress"}, {key: "Pickup", value: "PickupLocationOnly"}],
      COMMON_ORDER_UNITS: ["EA", "H", "VAL", "D"],
      PAY_TERMS: ["", "0001", "0005", "0006", "0007", "0008", "0010", "0014", "0020", "0021", "0030", "0045", "0060"],
      PAYMENT_TERMS_JUSTIFICATIONS: [{Key: "",Value: ""}, {Key: "DC",Value: "Demonstrated Clear and Direct Benefit to Defence"},
          {Key: "LR",Value: "Legislative Requirement"}, {Key: "ZC",Value: "Contract prior to 1 July 2022 (RMG 417)"}],
      ASSIGNMENT_TYPES:[{Key: "",Value: ""}, {Key: "A",Value: "Asset Number Known"}, {Key: "K",Value: "Cost Centre"}, {Key: "F",Value: "Internal Order"}, {
          Key: "P",Value: "Project"}, {Key: "T",Value: "Statistical Project"}, {Key: "X",Value: "Asset to be confirmed"}],
      ASSIGNMENT_TYPES_CONTRACT:[{Key: "",Value: ""}, {Key: "A",Value: "Asset Number Known"}, {Key: "K",Value: "Cost Centre"}, {Key: "F",Value: "Internal Order"}, {
          Key: "P",Value: "Project"}, {Key: "T",Value: "Statistical Project"}, {Key: "U",Value: "Unknown"}, {Key: "X",Value: "Asset to be confirmed"}],
      READY_STATE_FINISHED: 4,
      MAX_ERR: 20,
      APP_KEY: "PUR"
    };
});