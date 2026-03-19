sap.ui.define(
    ["sap/m/ColumnListItem",
    "sap/ui/core/Element"],
    function(ColumnListItem, Element) {
        
        //extension needed to handle table click on popin tables
        var TablePopin = Element.extend("sap.m.TablePopin", {
				ontap: function(oEvent) {
					// prevent the tap event if selection is done within the popin control and mark the event
					// if (oEvent.isMarked() || ListItemBase.detectTextSelection(this.getDomRef())) {
						return oEvent.stopImmediatePropagation(true);
					// }
		
					// // focus to the main row if there is nothing to focus in the popin
					// if (oEvent.srcControl === this || !jQuery(oEvent.target).is(":sapFocusable")) {
					// 	this.getParent().focus();
					// }
				}
			});
        
        return ColumnListItem.extend("fss.ssp.controls.ColumnListItem",{
            
            renderer: {},
            
            getPopin : function() {
				if (!this._oPopin) {
					this._oPopin = new TablePopin({
						id: this.getId() + "-sub"
					}).addEventDelegate({
						// handle the events of pop-in
						ontouchstart: this.ontouchstart,
						ontouchmove: this.ontouchmove,
						ontap: this.ontap,
						ontouchend: this.ontouchend,
						ontouchcancel: this.ontouchcancel,
						onsaptabnext: this.onsaptabnext,
						onsaptabprevious: this.onsaptabprevious,
						onsapup: this.onsapup,
						onsapdown: this.onsapdown,
						oncontextmenu: this.oncontextmenu
					}, this).setParent(this, null, true);
				}
		
				return this._oPopin;
			}
        });
    }
);