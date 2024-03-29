/**
 * Copyright (c) 2009-2010 The Open Planning Project
 *
 * @requires GeoExplorer.js
 */

/** api: (define)
 *  module = GeoExplorer
 *  class = GeoExplorer.Composer(config)
 *  extends = GeoExplorer
 */

/** api: constructor
 *  .. class:: GeoExplorer.Composer(config)
 *
 *      Create a GeoExplorer application intended for full-screen display.
 */
GeoExplorer.Composer = Ext.extend(GeoExplorer, {

    /** api: config[cookieParamName]
     *  ``String`` The name of the cookie parameter to use for storing the
     *  logged in user.
     */
    cookieParamName: 'geoexplorer-user',

    // Begin i18n.
    mapText: "Map",
    saveMapText: "Save map",
    exportMapText: "Export map",
    toolsTitle: "Choose tools to include in the toolbar:",
    previewText: "Preview",
    backText: "Back",
    nextText: "Next",
    loginText: "Login",
    logoutText: "Logout, {user}",
    loginErrorText: "Invalid username or password.",
    userFieldText: "User",
    passwordFieldText: "Password", 
    saveErrorText: "Trouble saving: ",
    tableText: "Table",
    queryText: "Query",
    // End i18n.

    constructor: function(config) {
        // Starting with this.authorizedRoles being undefined, which means no
        // authentication service is available
        if (config.authStatus === 401) {
            // user has not authenticated or is not authorized
            this.authorizedRoles = [];
        } else if (config.authStatus !== 404) {
            // user has authenticated
            this.authorizedRoles = ["ROLE_ADMINISTRATOR"];
        }
        // should not be persisted or accessed again
        delete config.authStatus;

        config.tools = [
            {
                ptype: "gxp_layermanager",
                outputConfig: {
                    id: "layers",
                    tbar: [],
                    autoScroll: true
                },
                outputTarget: "tree"
            }, {
                ptype: "gxp_addlayers",
                actionTarget: "layers.tbar",
                outputTarget: "tree",
                uploadSource: "local",
                postUploadAction: {
                    plugin: "layerproperties",
                    outputConfig: {activeTab: 2}
                }
            }, {
                ptype: "gxp_removelayer",
                actionTarget: ["layers.tbar", "layers.contextMenu"]
            }, {
                ptype: "gxp_layerproperties",
                id: "layerproperties",
                outputConfig: {defaults: {autoScroll: true}, width: 320},
                actionTarget: ["layers.tbar", "layers.contextMenu"],
                outputTarget: "tree"
            }, {
                ptype: "gxp_zoomtolayerextent",
                actionTarget: {target: "layers.contextMenu", index: 0},
                showButtonText: true,
                actionTarget: {target: "groupNavigate"}
            }, {
                ptype: "gxp_navigation", toggleGroup: "navigation",
                showButtonText: true,
                actionTarget: {target: "groupNavigate"}
            }, {
                ptype: "gxp_zoom", toggleGroup: "navigation",
                showZoomBoxAction: true,
                showButtonText: true,
                actionTarget: {target: "groupNavigate"},
                controlOptions: {zoomOnClick: false}
            }, {
                ptype: "gxp_navigationhistory",
                showButtonText: true,
                actionTarget: {target: "groupNavigate"}
            }, {
                ptype: "gxp_zoomtoextent",
                showButtonText: true,
                actionTarget: {target: "groupNavigate"}
            }, {
                actions: ["aboutbutton"],  
                actionTarget: {target: "groupGeneral"}
            }, {
                actions: ["mapmenu"],
                actionTarget: {target: "groupMap"}
            }, {
                ptype: "gxp_print",
                customParams: {outputFilename: 'GeoExplorer-print'},
                printService: config.printService,
                showButtonText: true,
                actionTarget: {target: "groupMap"}
            }, {
            //    actions: ["-"], actionTarget: "paneltbar"
            //}, {
                ptype: "gxp_wmsgetfeatureinfo", format: 'grid',
                toggleGroup: "interaction",
                showButtonText: true,
                actionTarget: {target: "groupInformation"}
            }, {
                ptype: "gxp_featuremanager",
                id: "querymanager",
                selectStyle: {cursor: ''},
                autoLoadFeatures: true,
                maxFeatures: 50,
                paging: true,
                pagingType: gxp.plugins.FeatureManager.WFS_PAGING
            }, {
                ptype: "gxp_queryform",
                featureManager: "querymanager",
                autoExpand: "query",
                actionTarget: {target: "groupInformation"},
                outputTarget: "query"
            }, {
                ptype: "gxp_featuregrid",
                featureManager: "querymanager",
                showTotalResults: true,
                autoLoadFeature: false,
                alwaysDisplayOnMap: true,
                controlOptions: {multiple: true},
                displayMode: "selected",
                outputTarget: "table",
                outputConfig: {
                    id: "featuregrid",
                    columnsSortable: false
                }
            }, {
                ptype: "gxp_zoomtoselectedfeatures",
                featureManager: "querymanager",
                actionTarget: ["featuregrid.contextMenu", "featuregrid.bbar"]
            }, {
                ptype: "gxp_measure", toggleGroup: "interaction",
                controlOptions: {immediate: true},
                showButtonText: true,
                actionTarget: {target: "groupInformation"}
            }, {
                ptype: "gxp_featuremanager",
                id: "featuremanager",
                maxFeatures: 20,
                paging: false
            }, {
                ptype: "gxp_featureeditor",
                featureManager: "featuremanager",
                autoLoadFeature: true,
                splitButton: true,
                showButtonText: true,
                toggleGroup: "interaction",
                actionTarget: {target: "groupMap"}
            }, {
                actions: ["->"],
                actionTarget: "paneltbar"
            }, {
                actions: ["loginbutton"],
                actionTarget: "paneltbar"
            }
        ];
        
        GeoExplorer.Composer.superclass.constructor.apply(this, arguments);
    },
    
    loadConfig: function(config) {
        GeoExplorer.Composer.superclass.loadConfig.apply(this, arguments);
        
        var query = Ext.urlDecode(document.location.search.substr(1));
        if (query && query.styler) {
            for (var i=config.map.layers.length-1; i>=0; --i) {
                delete config.map.layers[i].selected;
            }
            config.map.layers.push({
                source: "local",
                name: query.styler,
                selected: true,
                bbox: query.lazy && query.bbox ? query.bbox.split(",") : undefined
            });
            this.on('layerselectionchange', function(rec) {
                var styler = this.tools.styler,
                    layer = rec.getLayer(),
                    extent = layer.maxExtent;
                if (extent && !query.bbox) {
                    this.mapPanel.map.zoomToExtent(extent);
                }
                this.doAuthorized(styler.roles, styler.addOutput, styler);
            }, this, {single: true});            
        }
    },

    /** private: method[setCookieValue]
     *  Set the value for a cookie parameter
     */
    setCookieValue: function(param, value) {
        document.cookie = param + '=' + escape(value);
    },

    /** private: method[clearCookieValue]
     *  Clear a certain cookie parameter.
     */
    clearCookieValue: function(param) {
        document.cookie = param + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    },

    /** private: method[getCookieValue]
     *  Get the value of a certain cookie parameter. Returns null if not found.
     */
    getCookieValue: function(param) {
        var i, x, y, cookies = document.cookie.split(";");
        for (i=0; i < cookies.length; i++) {
            x = cookies[i].substr(0, cookies[i].indexOf("="));
            y = cookies[i].substr(cookies[i].indexOf("=")+1);
            x=x.replace(/^\s+|\s+$/g,"");
            if (x==param) {
                return unescape(y);
            }
        }
        return null;
    },

    /** private: method[logout]
     *  Log out the current user from the application.
     */
    logout: function() {
        this.clearCookieValue("JSESSIONID");
        this.clearCookieValue(this.cookieParamName);
        this.setAuthorizedRoles([]);
        Ext.getCmp('paneltbar').items.each(function(tool) {
            if (tool.needsAuthorization === true) {
                tool.disable();
            }
        });
        this.showLogin();
    },

    /** private: method[authenticate]
     * Show the login dialog for the user to login.
     */
    authenticate: function() {
        var panel = new Ext.FormPanel({
            url: "../login/",
            frame: true,
            labelWidth: 60,
            defaultType: "textfield",
            errorReader: {
                read: function(response) {
                    var success = false;
                    var records = [];
                    if (response.status === 200) {
                        success = true;
                    } else {
                        records = [
                            {data: {id: "username", msg: this.loginErrorText}},
                            {data: {id: "password", msg: this.loginErrorText}}
                        ];
                    }
                    return {
                        success: success,
                        records: records
                    };
                }
            },
            items: [{
                fieldLabel: this.userFieldText,
                name: "username",
                allowBlank: false,
                listeners: {
                    render: function() {
                        this.focus(true, 100);
                    }
                }
            }, {
                fieldLabel: this.passwordFieldText,
                name: "password",
                inputType: "password",
                allowBlank: false
            }],
            buttons: [{
                text: this.loginText,
                formBind: true,
                handler: submitLogin,
                scope: this
            }],
            keys: [{ 
                key: [Ext.EventObject.ENTER], 
                handler: submitLogin,
                scope: this
            }]
        });

        function submitLogin() {
            panel.buttons[0].disable();
            panel.getForm().submit({
                success: function(form, action) {
                    Ext.getCmp('paneltbar').items.each(function(tool) {
                        if (tool.needsAuthorization === true) {
                            tool.enable();
                        }
                    });
                    var user = form.findField('username').getValue();
                    this.setCookieValue(this.cookieParamName, user);
                    this.setAuthorizedRoles(["ROLE_ADMINISTRATOR"]);
                    this.showLogout(user);
                    win.un("beforedestroy", this.cancelAuthentication, this);
                    win.close();
                },
                failure: function(form, action) {
                    this.authorizedRoles = [];
                    panel.buttons[0].enable();
                    form.markInvalid({
                        "username": this.loginErrorText,
                        "password": this.loginErrorText
                    });
                },
                scope: this
            });
        }
                
        var win = new Ext.Window({
            title: this.loginText,
            layout: "fit",
            width: 235,
            height: 130,
            plain: true,
            border: false,
            modal: true,
            items: [panel],
            listeners: {
                beforedestroy: this.cancelAuthentication,
                scope: this
            }
        });
        win.show();
    },

    /**
     * private: method[applyLoginState]
     * Attach a handler to the login button and set its text.
     */
    applyLoginState: function(iconCls, text, handler, scope) {
        var loginButton = Ext.getCmp("loginbutton");
        loginButton.setIconClass(iconCls);
        loginButton.setText(text);
        loginButton.setHandler(handler, scope);
    },

    /** private: method[showLogin]
     *  Show the login button.
     */
    showLogin: function() {
        var text = this.loginText;
        var handler = this.authenticate;
        this.applyLoginState('login', text, handler, this);
    },

    /** private: method[showLogout]
     *  Show the logout button.
     */
    showLogout: function(user) {
        var text = new Ext.Template(this.logoutText).applyTemplate({user: user});
        var handler = this.logout;
        this.applyLoginState('logout', text, handler, this);
    },

    /** private: method[initPortal]
     * Create the various parts that compose the layout.
     */
    initPortal: function() {
        
        var westPanel = new gxp.CrumbPanel({
            id: "tree",
            region: "west",
            width: 320,
            split: true,
            collapsible: true,
            collapseMode: "mini",
            hideCollapseTool: true,
            header: false
        });
        var southPanel = new Ext.Panel({
            region: "south",
            id: "south",
            height: 220,
            border: false,
            split: true,
            collapsible: true,
            collapseMode: "mini",
            collapsed: true,
            hideCollapseTool: true,
            header: false,
            layout: "border",
            items: [{
                region: "center",
                id: "table",
                title: this.tableText,
                layout: "fit"
            }, {
                region: "west",
                width: 320,
                id: "query",
                title: this.queryText,
                split: true,
                collapsible: true,
                collapseMode: "mini",
                collapsed: true,
                hideCollapseTool: true,
                layout: "fit"
            }]
        });
        
		var General = new Ext.ButtonGroup({
		   title   : 'Algemeen',
		   id: 'groupGeneral',
		   defaults: {
            	iconAlign  : 'top',
				rowspan    : '2',
				scale      : 'medium'
				},
		   layout  : 'table',
		   height  : 73,
		   items   : []
		});
        
        var MapView = new Ext.ButtonGroup({
		   title   : 'Kaartbeeld',
		   id: 'groupMap',
		   defaults: {
            	iconAlign: 'top',
				rowspan: '2',
				scale: 'medium'
				},
		   layout  : 'table',
		   height  : 73,
		   items   : []
		});
		
        var Information = new Ext.ButtonGroup({
		   title   : 'Onderzoeken',
		   id: 'groupInformation',
		   defaults: {
            	iconAlign: 'top',
				rowspan: '2',
				scale: 'medium'
				},
		   layout  : 'table',
		   height  : 73,
		   items   : []
		});
		
		var Navigate = new Ext.ButtonGroup({
		   title   : 'Navigeren',
		   id: 'groupNavigate',
		   defaults: {
            	iconAlign: 'top',
				rowspan: '2',
				scale: 'medium',
				showButtonText: true
				},
		   layout  : 'table',
		   height  : 73,
		   items   : []
		});
		
        var toolbar = new Ext.Toolbar({
            disabled: true,
            id: 'paneltbar',
			items: [
					General,
					MapView,
					Information,
					Navigate	
				]
        });
        this.on("ready", function() {
            // enable only those items that were not specifically disabled
            var disabled = toolbar.items.filterBy(function(item) {
                return item.initialConfig && item.initialConfig.disabled;
            });
            toolbar.enable();
            disabled.each(function(item) {
                item.disable();
            });
        });

        this.mapPanelContainer = new Ext.Panel({
            layout: "card",
            region: "center",
            defaults: {
                border: false
            },
            items: [
                this.mapPanel
            ],
            activeItem: 0
        });
        
        this.portalItems = [{
            region: "center",
            layout: "border",
            tbar: toolbar,
            items: [
                this.mapPanelContainer,
                westPanel,
                southPanel
            ]
        }];
        
        GeoExplorer.Composer.superclass.initPortal.apply(this, arguments);        
    },
    
    /**
     * api: method[createTools]
     * Create the toolbar configuration for the main view.
     */
    createTools: function() {
        GeoExplorer.Composer.superclass.createTools.apply(this, arguments);

        new Ext.Button({id: "loginbutton"});

        if (this.authorizedRoles) {
            // unauthorized, show login button
            if (this.authorizedRoles.length === 0) {
                this.showLogin();
            } else {
                var user = this.getCookieValue(this.cookieParamName);
                if (user === null) {
                    user = "unknown";
                }
                this.showLogout(user);
            }
        }
        
        new Ext.Button({
            id: "mapmenu",
            text: this.mapText,
            iconCls: 'icon-map',
            menu: new Ext.menu.Menu({
                items: [{
                    text: this.exportMapText,
                    handler: function() {
                        this.doAuthorized(["ROLE_ADMINISTRATOR"], function() {
                            this.save(this.showEmbedWindow);
                        }, this);
                    },
                    scope: this,
                    iconCls: 'icon-export'
                }, {
                    text: this.saveMapText,
                    handler: function() {
                        this.doAuthorized(["ROLE_ADMINISTRATOR"], function() {
                            this.save(this.showUrl);
                        }, this);
                    },
                    scope: this,
                    iconCls: "icon-save"
                }]
            })            
        });
    },

    /** private: method[openPreview]
     */
    openPreview: function(embedMap) {
        var preview = new Ext.Window({
            title: this.previewText,
            layout: "fit",
            resizable: false,
            items: [{border: false, html: embedMap.getIframeHTML()}]
        });
        preview.show();
        var body = preview.items.get(0).body;
        var iframe = body.dom.firstChild;
        var loading = new Ext.LoadMask(body);
        loading.show();
        Ext.get(iframe).on('load', function() { loading.hide(); });
    },

    /** private: method[save]
     *
     * Saves the map config and displays the URL in a window.
     */ 
    save: function(callback, scope) {
        var configStr = Ext.util.JSON.encode(this.getState());
        var method, url;
        if (this.id) {
            method = "PUT";
            url = "../maps/" + this.id;
        } else {
            method = "POST";
            url = "../maps/";
        }
        OpenLayers.Request.issue({
            method: method,
            url: url,
            data: configStr,
            callback: function(request) {
                this.handleSave(request);
                if (callback) {
                    callback.call(scope || this);
                }
            },
            scope: this
        });
    },
        
    /** private: method[handleSave]
     *  :arg: ``XMLHttpRequest``
     */
    handleSave: function(request) {
        if (request.status == 200) {
            var config = Ext.util.JSON.decode(request.responseText);
            var mapId = config.id;
            if (mapId) {
                this.id = mapId;
                window.location.hash = "#maps/" + mapId;
            }
        } else {
            throw this.saveErrorText + request.responseText;
        }
    },

    /** private: method[showEmbedWindow]
     */
    showEmbedWindow: function() {
       var toolsArea = new Ext.tree.TreePanel({title: this.toolsTitle, 
           autoScroll: true,
           root: {
               nodeType: 'async', 
               expanded: true, 
               children: this.viewerTools
           }, 
           rootVisible: false,
           id: 'geobuilder-0'
       });

       var previousNext = function(incr){
           var l = Ext.getCmp('geobuilder-wizard-panel').getLayout();
           var i = l.activeItem.id.split('geobuilder-')[1];
           var next = parseInt(i, 10) + incr;
           l.setActiveItem(next);
           Ext.getCmp('wizard-prev').setDisabled(next==0);
           Ext.getCmp('wizard-next').setDisabled(next==1);
           if (incr == 1) {
               this.save();
           }
       };

       var embedMap = new gxp.EmbedMapDialog({
           id: 'geobuilder-1',
           url: "../viewer/#maps/" + this.id
       });

       var wizard = {
           id: 'geobuilder-wizard-panel',
           border: false,
           layout: 'card',
           activeItem: 0,
           defaults: {border: false, hideMode: 'offsets'},
           bbar: [{
               id: 'preview',
               text: this.previewText,
               handler: function() {
                   this.save(this.openPreview.createDelegate(this, [embedMap]));
               },
               scope: this
           }, '->', {
               id: 'wizard-prev',
               text: this.backText,
               handler: previousNext.createDelegate(this, [-1]),
               scope: this,
               disabled: true
           },{
               id: 'wizard-next',
               text: this.nextText,
               handler: previousNext.createDelegate(this, [1]),
               scope: this
           }],
           items: [toolsArea, embedMap]
       };

       new Ext.Window({
            layout: 'fit',
            width: 500, height: 300,
            title: this.exportMapText,
            items: [wizard]
       }).show();
    }

});
