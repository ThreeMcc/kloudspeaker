define(['kloudspeaker/settings', 'kloudspeaker/session', 'kloudspeaker/plugins', 'kloudspeaker/service', 'kloudspeaker/filesystem', 'kloudspeaker/permissions', 'kloudspeaker/dom', 'kloudspeaker/templates', 'kloudspeaker/ui/controls', 'kloudspeaker/ui/dialogs', 'kloudspeaker/localization', 'kloudspeaker/utils'], function(settings, session, plugins, service, fs, permissions, dom, templates, controls, dialogs, loc, utils) {
    //TODO split subviews etc into modules

    kloudspeaker.view.ConfigListView = function($e, o) {
        dom.template("kloudspeaker-tmpl-configlistview", {
            title: o.title,
            actions: o.actions || false
        }).appendTo($e);
        var $table = $e.find(".kloudspeaker-configlistview-table");
        var table = controls.table($table, o.table);
        var enableAction = function(id, e) {
            if (e)
                $e.find("#kloudspeaker-configlistview-action-" + id).removeClass("disabled");
            else
                $e.find("#kloudspeaker-configlistview-action-" + id).addClass("disabled");
        };
        if (o.actions) {
            $.each(o.actions, function(i, a) {
                if (a.depends) enableAction(a.id, false);
                if (a.tooltip) controls.tooltip($("#kloudspeaker-configlistview-action-" + a.id), {
                    title: a.tooltip
                });
            });

            table.onSelectionChanged(function() {
                var sel = table.getSelected();
                var any = sel.length > 0;
                var one = sel.length == 1;
                var many = sel.length > 1;
                $.each(o.actions, function(i, a) {
                    if (!a.depends) return;
                    if (a.depends == "table-selection") enableAction(a.id, any);
                    else if (a.depends == "table-selection-one") enableAction(a.id, one);
                    else if (a.depends == "table-selection-many") enableAction(a.id, many);
                });
            });
            $e.find(".kloudspeaker-configlistview-actions > .kloudspeaker-configlistview-action").click(function() {
                if ($(this).hasClass("disabled")) return;
                var action = $(this).tmplItem().data;
                if (!action.callback) return;

                var p;
                if (action.depends && action.depends.startsWith("table-selection")) p = table.getSelected();
                action.callback(p);
            });
        }

        return {
            table: table,
            enableAction: enableAction
        };
    }

    kloudspeaker.view.config = {
        user: {},
        admin: {}
    };

    /* Account */
    kloudspeaker.view.config.user.AccountView = function(mv) {
        var that = this;
        this.viewId = "account";
        this.title = loc.get("configUserAccountNavTitle");

        this.onActivate = function($c) {
            var s = session.get();

            dom.template("kloudspeaker-tmpl-config-useraccountview", s).appendTo($c);
            kloudspeaker.ui.process($c, ["localize"]);
            $("#user-account-change-password-btn").click(mv.changePassword);
        }
    }

    /* Users */
    kloudspeaker.view.config.admin.UsersView = function() {
        var that = this;
        this.viewId = "users";

        this.init = function(opt, cv) {
            that._cv = cv;
            that.title = loc.get("configAdminUsersNavTitle");

            that._authenticationOptions = opt.authentication_methods;
            that._authFormatter = function(am) {
                return am; /* TODO */
            }
            that._defaultAuthMethod = opt.authentication_methods[0];
            that._langFormatter = function(l) {
                return loc.get('language_' + l);
            }
        }

        this.onActivate = function($c) {
            var users = false;
            var listView = false;
            that._details = controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), {
                resizable: true
            });

            var getQueryParams = function(i) {
                var params = {
                    criteria: {}
                };

                var name = $("#kloudspeaker-admin-user-searchoptions-name").val();
                if (name && name.length > 0) params.criteria.name = name;

                var email = $("#kloudspeaker-admin-user-searchoptions-email").val();
                if (email && email.length > 0) params.criteria.email = email;

                return params;
            }

            var refresh = function() {
                that._cv.showLoading(true);
                listView.table.refresh().done(function() {
                    that._cv.showLoading(false);
                });
            };

            var updateUsers = function() {
                that._details.hide();
                refresh();
            };

            listView = new kloudspeaker.view.ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: function() {
                        that.onAddEditUser(false, updateUsers);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        dialogs.confirmation({
                            title: loc.get("configAdminUsersRemoveUsersConfirmationTitle"),
                            message: loc.get("configAdminUsersRemoveUsersConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeUsers(sel).done(updateUsers);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="fa fa-refresh"></i>',
                    callback: refresh
                }],
                table: {
                    id: "config-admin-users",
                    key: "id",
                    narrow: true,
                    hilight: true,
                    remote: {
                        path: "configuration/users/query",
                        paging: {
                            max: 50
                        },
                        queryParams: getQueryParams,
                        onLoad: function(pr) {
                            $c.addClass("loading");
                            pr.done(function() {
                                $c.removeClass("loading");
                            });
                        }
                    },
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-user"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersNameTitle'),
                        sortable: true
                    }, {
                        id: "user_type",
                        title: loc.get('configAdminUsersTypeTitle'),
                        sortable: true,
                        valueMapper: function(item, type) {
                            if (type == null) return loc.get("configAdminUsersTypeNormal");
                            return loc.get("configAdminUsersType_" + type.toLowerCase());
                        }
                    }, {
                        id: "email",
                        title: loc.get('configAdminUsersEmailTitle'),
                        sortable: true
                    }, {
                        id: "edit",
                        title: loc.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="fa fa-edit"></i>'
                    }, {
                        id: "pw",
                        title: loc.get('configAdminUsersActionChangePasswordTitle'),
                        type: "action",
                        content: '<i class="fa fa-key"></i>',
                        enabled: function(u) {
                            var auth = u.auth;
                            if (!auth) auth = that._defaultAuthMethod;
                            return (auth == 'pw');
                        }
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "edit") {
                            that.onAddEditUser(u.id, updateUsers);
                        } else if (id == "pw") {
                            that.onChangePassword(u);
                        } else if (id == "remove") {
                            dialogs.confirmation({
                                title: loc.get("configAdminUsersRemoveUserConfirmationTitle"),
                                message: loc.get("configAdminUsersRemoveUserConfirmationMessage", [u.name]),
                                callback: function() {
                                    service.del("configuration/users/" + u.id).done(updateUsers);
                                }
                            });
                        }
                    },
                    onHilight: function(u) {
                        if (u) {
                            that._showUserDetails(u, that._details.getContentElement().empty(), that._allGroups, that._allFolders);
                            that._details.show(false, 400);
                        } else {
                            that._details.hide();
                        }
                    }
                }
            });

            that._cv.showLoading(true);

            var $options = $c.find(".kloudspeaker-configlistview-options");
            dom.template("kloudspeaker-tmpl-config-admin-user-searchoptions").appendTo($options);
            kloudspeaker.ui.process($options, ["localize"]);

            var gp = service.get("configuration/usergroups").done(function(g) {
                that._allGroups = g;
            });
            var fp = service.get("configuration/folders").done(function(f) {
                that._allFolders = f;
            });
            $.when(gp, fp).done(refresh);
        }

        this.onChangePassword = function(u, cb) {
            var $content = false;
            var $name = false;
            var $password = false;

            dialogs.custom({
                resizable: true,
                initSize: [600, 200],
                title: loc.get('configAdminUsersChangePasswordDialogTitle', u.name),
                content: dom.template("kloudspeaker-tmpl-config-admin-userchangepassworddialog", {
                    user: u
                }),
                buttons: [{
                    id: "yes",
                    "title": loc.get('dialogSave')
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    if (btn.id == 'no') {
                        d.close();
                        return;
                    }

                    var password = $password.val();
                    if (!password || password.length === 0) return;

                    service.put("configuration/users/" + u.id + "/password", {
                        "new": utils.Base64.encode(password)
                    }).done(d.close).done(cb);
                },
                "on-show": function(h, $d) {
                    $("#change-password-title").text(loc.get('configAdminUsersChangePasswordTitle', u.name));

                    $content = $d.find("#kloudspeaker-config-admin-userchangepassworddialog-content");
                    $password = $d.find("#passwordField");
                    $("#generatePasswordBtn").click(function() {
                        $password.val(that._generatePassword());
                        return false;
                    });

                    $password.focus();
                    h.center();
                }
            });
        };

        this.onDeactivate = function() {
            that._details.remove();
        };

        this._showUserDetails = function(u, $e, allGroups, allFolders) {
            dom.template("kloudspeaker-tmpl-config-admin-userdetails", {
                user: u
            }).appendTo($e);
            kloudspeaker.ui.process($e, ["localize"]);
            var $groups = $e.find(".kloudspeaker-config-admin-userdetails-groups");
            var $folders = $e.find(".kloudspeaker-config-admin-userdetails-folders");
            var foldersView = false;
            var groupsView = false;
            var permissionsView = false;
            var folders = false;
            var groups = false;

            var updateGroups = function() {
                $groups.addClass("loading");
                service.get("configuration/users/" + u.id + "/groups/").done(function(l) {
                    $groups.removeClass("loading");
                    groups = l;
                    groupsView.table.set(groups);
                });
            };
            var updateFolders = function() {
                $folders.addClass("loading");
                service.get("configuration/users/" + u.id + "/folders/").done(function(l) {
                    $folders.removeClass("loading");
                    folders = l;
                    foldersView.table.set(folders);
                });
            };
            var onAddUserFolders = function() {
                var currentIds = utils.extractValue(folders, "id");
                var selectable = utils.filter(allFolders, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminUserAddFolderTitle'),
                    message: loc.get('configAdminUserAddFolderMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersFolderDefaultNameTitle')
                    }, {
                        id: "user_name",
                        title: loc.get('configAdminUsersFolderNameTitle'),
                        type: "input"
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        var folders = [];
                        $.each(sel, function(i, f) {
                            var folder = {
                                id: f.id
                            };
                            var name = o[f.id] ? o[f.id].user_name : false;
                            if (name && f.name != name)
                                folder.name = name;
                            folders.push(folder);
                        });
                        service.post("configuration/users/" + u.id + "/folders/", folders).done(updateFolders);
                    }
                });
            };
            var onAddUserGroups = function() {
                var currentIds = utils.extractValue(groups, "id");
                var selectable = utils.filter(allGroups, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminUserAddGroupTitle'),
                    message: loc.get('configAdminUserAddGroupMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersGroupNameTitle')
                    }, {
                        id: "description",
                        title: loc.get('configAdminGroupsDescriptionTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        service.post("configuration/users/" + u.id + "/groups/", utils.extractValue(sel, "id")).done(updateGroups);
                    }
                });
            };

            foldersView = new kloudspeaker.view.ConfigListView($e.find(".kloudspeaker-config-admin-userdetails-folders"), {
                title: loc.get('configAdminUsersFoldersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddUserFolders
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.del("configuration/users/" + u.id + "/folders/", {
                            ids: utils.extractValue(sel, "id")
                        }).done(updateFolders);
                    }
                }],
                table: {
                    id: "config-admin-userfolders",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersFolderNameTitle'),
                        formatter: function(f, v) {
                            var n = f.name;
                            if (n && n.length > 0) return n;
                            return loc.get('configAdminUsersFolderDefaultName', f.default_name);
                        }
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "remove") {
                            service.del("configuration/users/" + u.id + "/folders/" + f.id).done(updateFolders);
                        }
                    }
                }
            });

            groupsView = new kloudspeaker.view.ConfigListView($e.find(".kloudspeaker-config-admin-userdetails-groups"), {
                title: loc.get('configAdminUsersGroupsTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddUserGroups
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.del("configuration/users/" + u.id + "/groups/", {
                            ids: utils.extractValue(sel, "id")
                        }).done(updateGroups);
                    }
                }],
                table: {
                    id: "config-admin-usergroups",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-user"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersGroupNameTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, g) {
                        if (id == "remove") {
                            service.del("configuration/users/" + u.id + "/groups/" + g.id).done(updateGroups);
                        }
                    }
                }
            });

            plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".kloudspeaker-config-admin-userdetails-permissions"), loc.get('configAdminUsersPermissionsTitle'), u);

            updateGroups();
            updateFolders();
        }

        this._generatePassword = function() {
            var length = 8;
            var password = '';
            var c;

            for (var i = 0; i < length; i++) {
                while (true) {
                    c = (parseInt(Math.random() * 1000, 10) % 94) + 33;
                    if (that._isValidPasswordChar(c)) break;
                }
                password += String.fromCharCode(c);
            }
            return password;
        }

        this._isValidPasswordChar = function(c) {
            if (c >= 33 && c <= 47) return false;
            if (c >= 58 && c <= 64) return false;
            if (c >= 91 && c <= 96) return false;
            if (c >= 123 && c <= 126) return false;
            return true;
        }

        this._removeUsers = function(users) {
            return service.del("configuration/users", {
                ids: utils.extractValue(users, "id")
            });
        }

        this.onAddEditUser = function(userId, cb) {
            dialogs.custom({
                title: loc.get(userId ? 'configAdminUsersUserDialogEditTitle' : 'configAdminUsersUserDialogAddTitle'),
                model: ['kloudspeaker/config/user/addedit', {
                    userId: userId,
                    authenticationOptions: that._authenticationOptions
                }],
                view: 'templates/kloudspeaker/config/user/addedit',
                buttons: [{
                    id: "yes",
                    "title": loc.get('dialogSave')
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }]
            }).done(cb);
        }
    }

    /* Groups */
    kloudspeaker.view.config.admin.GroupsView = function() {
        var that = this;
        this.viewId = "groups";

        this.init = function(s, cv) {
            that._cv = cv;
            that.title = loc.get("configAdminGroupsNavTitle");
        }

        this.onActivate = function($c) {
            var groups = false;
            var listView = false;
            that._details = controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), {
                resizable: true
            });

            var updateGroups = function() {
                that._details.hide();
                that._cv.showLoading(true);
                service.get("configuration/usergroups/").done(function(l) {
                    that._cv.showLoading(false);
                    groups = l;
                    listView.table.set(groups);
                });
            };

            listView = new kloudspeaker.view.ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: function() {
                        that.onAddEditGroup(false, updateGroups);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        dialogs.confirmation({
                            title: loc.get("configAdminGroupsRemoveGroupsConfirmationTitle"),
                            message: loc.get("configAdminGroupsRemoveGroupsConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeGroups(sel).done(updateGroups);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="fa fa-refresh"></i>',
                    callback: updateGroups
                }],
                table: {
                    id: "config-admin-groups",
                    key: "id",
                    narrow: true,
                    hilight: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-user"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminGroupsNameTitle')
                    }, {
                        id: "description",
                        title: loc.get('configAdminGroupsDescriptionTitle')
                    }, {
                        id: "edit",
                        title: loc.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="fa fa-edit"></i>'
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, g) {
                        if (id == "edit") {
                            that.onAddEditGroup(g, updateGroups);
                        } else if (id == "remove") {
                            dialogs.confirmation({
                                title: loc.get("configAdminGroupsRemoveGroupConfirmationTitle"),
                                message: loc.get("configAdminGroupsRemoveGroupConfirmationMessage", [g.name]),
                                callback: function() {
                                    service.del("configuration/usergroups/" + g.id).done(updateGroups);
                                }
                            });
                        }
                    },
                    onHilight: function(u) {
                        if (u) {
                            that._showGroupDetails(u, that._details.getContentElement().empty(), that._allUsers, that._allFolders);
                            that._details.show(false, 400);
                        } else {
                            that._details.hide();
                        }
                    }
                }
            });
            updateGroups();

            that._cv.showLoading(true);
            var up = service.get("configuration/users").done(function(u) {
                that._allUsers = u;
            });
            var fp = service.get("configuration/folders").done(function(f) {
                that._allFolders = f;
            });
            $.when(up, fp).done(function() {
                that._cv.showLoading(false);
            });
        }

        this.onDeactivate = function() {
            that._details.remove();
        };

        this._showGroupDetails = function(g, $e, allUsers, allFolders) {
            dom.template("kloudspeaker-tmpl-config-admin-groupdetails", {
                group: g
            }).appendTo($e);
            kloudspeaker.ui.process($e, ["localize"]);
            var $users = $e.find(".kloudspeaker-config-admin-groupdetails-users");
            var $folders = $e.find(".kloudspeaker-config-admin-groupdetails-folders");
            var foldersView = false;
            var usersView = false;
            var folders = false;
            var users = false;

            var updateUsers = function() {
                $users.addClass("loading");
                service.get("configuration/usergroups/" + g.id + "/users/").done(function(l) {
                    $users.removeClass("loading");
                    users = l;
                    usersView.table.set(users);
                });
            };
            var updateFolders = function() {
                $folders.addClass("loading");
                service.get("configuration/users/" + g.id + "/folders/").done(function(l) {
                    $folders.removeClass("loading");
                    folders = l;
                    foldersView.table.set(folders);
                });
            };
            var onAddGroupUsers = function() {
                var currentIds = utils.extractValue(users, "id");
                var selectable = utils.filter(allUsers, function(u) {
                    return u.is_group === 0 && currentIds.indexOf(u.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminGroupAddUserTitle'),
                    message: loc.get('configAdminGroupAddUserMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersNameTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        service.post("configuration/usergroups/" + g.id + "/users/", utils.extractValue(sel, "id")).done(updateUsers);
                    }
                });
            };
            var onAddGroupFolders = function() {
                var currentIds = utils.extractValue(folders, "id");
                var selectable = utils.filter(allFolders, function(f) {
                    return currentIds.indexOf(f.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminGroupAddFolderTitle'),
                    message: loc.get('configAdminGroupAddFolderMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersFolderDefaultNameTitle')
                    }, {
                        id: "user_name",
                        title: loc.get('configAdminUsersFolderNameTitle'),
                        type: "input"
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        var folders = [];
                        $.each(sel, function(i, f) {
                            var folder = {
                                id: f.id
                            };
                            var name = o[f.id] ? o[f.id].user_name : false;
                            if (name && f.name != name)
                                folder.name = name;
                            folders.push(folder);
                        });
                        service.post("configuration/users/" + g.id + "/folders/", folders).done(updateFolders);
                    }
                });
            };

            foldersView = new kloudspeaker.view.ConfigListView($folders, {
                title: loc.get('configAdminGroupsFoldersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddGroupFolders
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.del("configuration/users/" + g.id + "/folders/", {
                            ids: utils.extractValue(sel, "id")
                        }).done(updateFolders);
                    }
                }],
                table: {
                    id: "config-admin-groupfolders",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersFolderNameTitle'),
                        valueMapper: function(f, v) {
                            var n = f.name;
                            if (n && n.length > 0) return n;
                            return loc.get('configAdminUsersFolderDefaultName', f.default_name);
                        }
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "remove") {
                            service.del("configuration/users/" + g.id + "/folders/" + f.id).done(updateFolders);
                        }
                    }
                }
            });

            usersView = new kloudspeaker.view.ConfigListView($users, {
                title: loc.get('configAdminGroupsUsersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddGroupUsers
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.post("configuration/usergroups/" + g.id + "/remove_users/", utils.extractValue(sel, "id")).done(updateUsers);
                    }
                }],
                table: {
                    id: "config-admin-groupusers",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUsersNameTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "remove") {
                            service.post("configuration/usergroups/" + g.id + "/remove_users/", [u.id]).done(updateUsers);
                        }
                    }
                }
            });

            plugins.get('plugin-permissions').getUserConfigPermissionsListView($e.find(".kloudspeaker-config-admin-groupdetails-permissions"), loc.get('configAdminGroupsPermissionsTitle'), g);

            updateUsers();
            updateFolders();
        }

        this._removeGroups = function(groups) {
            return service.del("configuration/usergroups", {
                ids: utils.extractValue(groups, "id")
            });
        }

        this.onAddEditGroup = function(g, cb) {
            var $content = false;
            var $name = false;
            var $description = false;

            dialogs.custom({
                resizable: true,
                initSize: [600, 400],
                title: loc.get(g ? 'configAdminGroupsDialogEditTitle' : 'configAdminGroupsDialogAddTitle'),
                content: dom.template("kloudspeaker-tmpl-config-admin-groupdialog", {
                    group: g
                }),
                buttons: [{
                    id: "yes",
                    "title": loc.get('dialogSave')
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    if (btn.id == 'no') {
                        d.close();
                        return;
                    }
                    var name = $name.val();
                    if (!name || name.length === 0) return;
                    var desc = $description.val();

                    var group = {
                        name: name,
                        description: desc
                    };

                    if (g) {
                        service.put("configuration/usergroups/" + g.id, group).done(d.close).done(cb);
                    } else {
                        service.post("configuration/usergroups", group).done(d.close).done(cb);
                    }
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#kloudspeaker-config-admin-groupdialog-content");
                    $name = $d.find("#nameField");
                    $description = $d.find("#descriptionField");

                    if (g) {
                        $name.val(g.name);
                        $description.val(g.description || "");
                    }
                    $name.focus();

                    h.center();
                }
            });
        }
    }

    /* Folders */
    kloudspeaker.view.config.admin.FoldersView = function() {
        var that = this;
        this.viewId = "folders";

        this.init = function(s, cv) {
            that._cv = cv;
            that._settings = s;
            that.title = loc.get("configAdminFoldersNavTitle");
        }

        this.onActivate = function($c) {
            var folders = false;
            var listView = false;
            that._details = controls.slidePanel($("#kloudspeaker-mainview-viewcontent"), {
                resizable: true
            });

            var updateFolders = function() {
                that._cv.showLoading(true);

                service.get("configuration/folders/").done(function(l) {
                    that._cv.showLoading(false);
                    folders = l;
                    listView.table.set(folders);
                });
            };

            listView = new kloudspeaker.view.ConfigListView($c, {
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: function() {
                        that.onAddEditFolder(false, updateFolders);
                    }
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        dialogs.confirmation({
                            title: loc.get("configAdminFoldersRemoveFoldersConfirmationTitle"),
                            message: loc.get("configAdminFoldersRemoveFoldersConfirmationMessage", [sel.length]),
                            callback: function() {
                                that._removeFolders(sel).done(updateFolders);
                            }
                        });
                    }
                }, {
                    id: "action-refresh",
                    content: '<i class="fa fa-refresh"></i>',
                    callback: updateFolders
                }],
                table: {
                    id: "config-admin-folders",
                    key: "id",
                    narrow: true,
                    hilight: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        type: "static",
                        content: '<i class="fa fa-folder"></i>'
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminFoldersNameTitle')
                    }, {
                        id: "path",
                        title: loc.get('configAdminFoldersPathTitle')
                    }, {
                        id: "edit",
                        title: loc.get('configAdminActionEditTitle'),
                        type: "action",
                        content: '<i class="fa fa-edit"></i>'
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, f) {
                        if (id == "edit") {
                            that.onAddEditFolder(f, updateFolders);
                        } else if (id == "remove") {
                            dialogs.confirmation({
                                title: loc.get("configAdminFoldersRemoveFolderConfirmationTitle"),
                                message: loc.get("configAdminFoldersRemoveFolderConfirmationMessage", [f.name]),
                                options: {
                                    deleteContents: loc.get("configAdminFoldersRemoveFolderContentConfirmation")
                                },
                                callback: function(opts) {
                                    var p = "configuration/folders/" + f.id;
                                    if (opts.deleteContents) p += '?delete=true'
                                    service.del(p).done(function(f) {
                                        fs.updateRoots(f.folders, f.roots);
                                        updateFolders();
                                    });
                                }
                            });
                        }
                    },
                    onHilight: function(f) {
                        if (f) {
                            that._showFolderDetails(f, that._details.getContentElement().empty(), that._allGroups, that._allUsers);
                            that._details.show(false, 400);
                        } else {
                            that._details.hide();
                        }
                    }
                }
            });
            updateFolders();

            that._cv.showLoading(true);
            var gp = service.get("configuration/usersgroups").done(function(r) {
                that._allUsers = r.users;
                that._allGroups = r.groups;
                that._cv.showLoading(false);
            });
        }

        this.onDeactivate = function() {
            that._details.remove();
        };

        this._showFolderDetails = function(f, $e, allUsers, allGroups) {
            dom.template("kloudspeaker-tmpl-config-admin-folderdetails", {
                folder: f
            }).appendTo($e);
            kloudspeaker.ui.process($e, ["localize"]);
            var $usersAndGroups = $e.find(".kloudspeaker-config-admin-folderdetails-usersandgroups");
            var usersAndGroupsView = false;
            var usersAndGroups = false;
            var allUsersAndGroups = allUsers.concat(allGroups);

            var updateUsersAndGroups = function() {
                $usersAndGroups.addClass("loading");
                service.get("configuration/folders/" + f.id + "/users/").done(function(l) {
                    $usersAndGroups.removeClass("loading");
                    usersAndGroups = l;
                    usersAndGroupsView.table.set(l);
                });
            };
            var onAddUserGroup = function() {
                var currentIds = utils.extractValue(usersAndGroups, "id");
                var selectable = utils.filter(allUsersAndGroups, function(ug) {
                    return currentIds.indexOf(ug.id) < 0;
                });
                //if (selectable.length === 0) return;

                dialogs.select({
                    title: loc.get('configAdminFolderAddUserTitle'),
                    message: loc.get('configAdminFolderAddUserMessage'),
                    key: "id",
                    initSize: [600, 400],
                    columns: [{
                        id: "icon",
                        title: "",
                        valueMapper: function(i, v) {
                            if (i.is_group == 1) return "<i class='fa fa-user'></i><i class='fa fa-user'></i>";
                            return "<i class='fa fa-user'></i>";
                        }
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUserDialogUsernameTitle')
                    }],
                    list: selectable,
                    onSelect: function(sel, o) {
                        service.post("configuration/folders/" + f.id + "/users/", utils.extractValue(sel, "id")).done(function(f) {
                            fs.updateRoots(f.folders, f.roots);
                            updateUsersAndGroups()
                        });
                    }
                });
            }

            usersAndGroupsView = new kloudspeaker.view.ConfigListView($usersAndGroups, {
                title: loc.get('configAdminFolderUsersTitle'),
                actions: [{
                    id: "action-add",
                    content: '<i class="fa fa-plus"></i>',
                    callback: onAddUserGroup
                }, {
                    id: "action-remove",
                    content: '<i class="fa fa-trash"></i>',
                    cls: "btn-danger",
                    depends: "table-selection",
                    callback: function(sel) {
                        service.post("configuration/folders/" + f.id + "/remove_users/", utils.extractValue(sel, "id")).done(function(f) {
                            fs.updateRoots(f.folders, f.roots);
                            updateUsersAndGroups();
                        });
                    }
                }],
                table: {
                    id: "config-admin-folderusers",
                    key: "id",
                    narrow: true,
                    columns: [{
                        type: "selectrow"
                    }, {
                        id: "icon",
                        title: "",
                        valueMapper: function(i, v) {
                            if (i.is_group == 1) return "<i class='fa fa-user'></i><i class='fa fa-user'></i>";
                            return "<i class='fa fa-user'></i>";
                        }
                    }, {
                        id: "id",
                        title: loc.get('configAdminTableIdTitle')
                    }, {
                        id: "name",
                        title: loc.get('configAdminUserDialogUsernameTitle')
                    }, {
                        id: "remove",
                        title: loc.get('configAdminActionRemoveTitle'),
                        type: "action",
                        content: '<i class="fa fa-trash"></i>'
                    }],
                    onRowAction: function(id, u) {
                        if (id == "remove") {
                            service.post("configuration/folders/" + f.id + "/remove_users/", [u.id]).done(updateUsersAndGroups);
                        }
                    }
                }
            });

            updateUsersAndGroups();
        }

        this._removeFolders = function(f) {
            return service.del("configuration/folders", {
                ids: utils.extractValue(f, "id")
            });
        }

        this._isValidPath = function(p) {
            if (!p) return false;
            if (p.indexOf("..") >= 0) return false;
            if (that._settings.published_folders_root) {
                // if root setting is defined, prevent using absolute paths
                if (p.indexOf("/") === 0 || p.indexOf(":\\") === 0) return false;
            }
            return true;
        }

        this.onAddEditFolder = function(f, cb) {
            var $content = false;
            var $name = false;
            var $path = false;

            dialogs.custom({
                resizable: true,
                initSize: [500, 300],
                title: loc.get(f ? 'configAdminFoldersFolderDialogEditTitle' : 'configAdminFoldersFolderDialogAddTitle'),
                content: dom.template("kloudspeaker-tmpl-config-admin-folderdialog", {
                    folder: f
                }),
                buttons: [{
                    id: "yes",
                    "title": loc.get('dialogSave')
                }, {
                    id: "no",
                    "title": loc.get('dialogCancel')
                }],
                "on-button": function(btn, d) {
                    if (btn.id == 'no') {
                        d.close();
                        return;
                    }
                    $content.find(".control-group").removeClass("error");

                    var name = $name.val();
                    if (!name) $name.closest(".control-group").addClass("error");

                    var path = $path.val();
                    var pathValid = that._isValidPath(path);
                    if (!pathValid) $path.closest(".control-group").addClass("error");

                    if (!name) {
                        $name.focus();
                        return;
                    }
                    if (!pathValid) {
                        $path.focus();
                        return;
                    }

                    var folder = {
                        name: name,
                        path: path
                    };
                    var onFail = function(e) {
                        if (e.code == 105 && !f) {
                            this.handled = true;

                            dialogs.confirmation({
                                title: loc.get('configAdminFoldersFolderDialogAddTitle'),
                                message: loc.get('configAdminFoldersFolderDialogAddFolderDoesNotExist'),
                                callback: function() {
                                    folder.create = true;
                                    if (!f)
                                        service.post("configuration/folders", folder).done(d.close).done(cb);
                                    else
                                        service.put("configuration/folders/" + f.id, folder).done(d.close).done(cb);
                                }
                            });
                        }
                    };
                    if (f) {
                        service.put("configuration/folders/" + f.id, folder).done(d.close).done(cb).fail(onFail);
                    } else {
                        service.post("configuration/folders", folder).done(d.close).done(cb).fail(onFail);
                    }
                },
                "on-show": function(h, $d) {
                    $content = $d.find("#kloudspeaker-config-admin-folderdialog-content");
                    $name = $d.find("#nameField");
                    $path = $d.find("#pathField");

                    if (f) {
                        $name.val(f.name);
                        $path.val(f.path);
                    }
                    $name.focus();

                    h.center();
                }
            });
        }
    };

    // config view

    return function() {
        //TODO remove reference to global "kloudspeaker"
        var that = this;
        this.viewId = "admin";

        this._views = [];
        this._adminViews = [];
        this._adminViewsLoaded = false;

        this.init = function(mv) {
            that.title = loc.get('configviewMenuTitle');
            that.icon = "fa fa-cogs";

            that._views.push(new kloudspeaker.view.config.user.AccountView(mv));

            var s = session.get();
            $.each(plugins.getConfigViewPlugins(), function(i, p) {
                if (!p.configViewHandler.views) return;

                var views = p.configViewHandler.views();
                if (!views) return;

                $.each(views, function(i, v) {
                    if (v.admin) {
                        if (s.user.admin || (v.requiresPermission && permissions.hasPermission(v.requiresPermission)))
                            that._adminViews.push(v);
                    } else
                        that._views.push(v);
                });
            });
            _.each(kloudspeaker.ui._configViews, function(v) {
                if (v.admin) {
                    if (s.user.admin || (v.requiresPermission && permissions.hasPermission(v.requiresPermission)))
                        that._adminViews.push(v);
                } else {
                    that._views.push(v);
                }
            });
        }

        this.onResize = function() {}

        this.onActivate = function(h) {
            templates.load("configview", templates.url("configview.html")).done(function() {
                dom.template("kloudspeaker-tmpl-configview").appendTo(h.content);

                that.showLoading(true);

                var navBarItems = [];
                $.each(that._views, function(i, v) {
                    var title = v.title;
                    if (typeof(title) === "string" && title.startsWith("i18n:")) title = loc.get(title.substring(5));
                    if (utils.isArray(title)) title = loc.get(title[0], title.slice(1));

                    navBarItems.push({
                        title: title,
                        obj: v,
                        callback: function() {
                            that._activateView(v);
                        }
                    })
                });

                that._userNav = h.addNavBar({
                    title: loc.get("configViewUserNavTitle"),
                    items: navBarItems
                });

                that.onResize();

                if (that._adminViewsLoaded) {
                    that._initAdminViews(h);
                } else {
                    that._adminViewsLoaded = true;

                    // default admin views
                    var s = session.get();
                    if (s.user.admin) {
                        that._adminViews.unshift(new kloudspeaker.view.config.admin.FoldersView());
                        that._adminViews.unshift(new kloudspeaker.view.config.admin.GroupsView());
                        that._adminViews.unshift(new kloudspeaker.view.config.admin.UsersView());
                        that._adminViews.unshift({
                            viewId: 'system',
                            title: loc.get("configSystemNavTitle"),
                            model: 'kloudspeaker/config/system',
                            view: '#kloudspeaker-tmpl-config-systemview'
                        });
                    }

                    var plugins = [];
                    for (var k in s.plugins) {
                        if (!s.plugins[k] || !s.plugins[k].admin) continue;
                        plugins.push(k);
                    }
                    kloudspeaker.admin = {
                        plugins: []
                    };
                    that._loadAdminPlugins(plugins).done(function() {
                        that._initAdminViews(h);
                    });
                }
            });
        }

        this._loadAdminPlugins = function(ids) {
            var df = $.Deferred();
            var l = [];
            var s = session.get();

            if (s.user.admin)
                l.push(service.get("configuration/settings").done(function(s) {
                    that._settings = s;
                }));
            for (var i = 0, j = ids.length; i < j; i++) {
                l.push(dom.importScript(plugins.url(ids[i], "plugin.js", true)));
            }

            $.when.apply($, l).done(function() {
                var o = [];

                var addView = function(i, v) {
                    if (v.requiresPermission) {
                        if (!s.user.admin && !permissions.hasPermission(v.requiresPermission)) return;
                    } else {
                        if (!s.user.admin) return;
                    }
                    that._adminViews.push(v);
                };
                for (var pk in kloudspeaker.admin.plugins) {
                    var p = kloudspeaker.admin.plugins[pk];
                    if (!p || !p.views) continue;

                    if (p.resources && p.resources.texts)
                        o.push(loc.loadPlugin(pk));
                    if (p.resources && p.resources.css)
                        o.push(dom.importCss(plugins.url(pk, "plugin.css", true)));
                    $.each(p.views, addView);
                }

                $.when.apply($, o).done(df.resolve);
            });
            return df;
        };

        this._initAdminViews = function(h) {
            if (that._adminViews && that._adminViews.length > 0) {
                $.each(that._adminViews, function(i, v) {
                    if (v.init) v.init(that._settings, that);
                });

                var navBarItems = [];
                $.each(that._adminViews, function(i, v) {
                    var title = v.title;
                    if (typeof(title) === "string" && title.startsWith("i18n:")) title = loc.get(title.substring(5));
                    if (utils.isArray(title)) title = loc.get(title[0], title.slice(1));

                    navBarItems.push({
                        title: title,
                        obj: v,
                        callback: function() {
                            that._activateView(v, true);
                        }
                    })
                });

                that._adminNav = h.addNavBar({
                    title: loc.get("configViewAdminNavTitle"),
                    items: navBarItems
                });
            }

            that._onInitDone(h);
        };

        this._findView = function(id) {
            var found = false;
            $.each(that._views, function(i, v) {
                if (v.viewId == id) {
                    found = {
                        view: v,
                        admin: false
                    };
                    return false;
                }
            });
            if (!found)
                $.each(that._adminViews, function(i, v) {
                    if (v.viewId == id) {
                        found = {
                            view: v,
                            admin: true
                        };
                        return false;
                    }
                });

            return found;
        };

        this._onInitDone = function(h) {
            if (h.id) {
                var view = that._findView(h.id[0]);
                if (view) that._activateView(view.view, view.admin);
            } else
                that._activateView(that._views[0]);
        }

        this.onRestoreView = function(id) {
            var view = that._findView(id[0]);
            if (view) that._activateView(view.view, view.admin, true);
        };

        this._activateView = function(v, admin, noStore) {
            if (that._activeView) {
                if (that._activeView.onDeactivate) that._activeView.onDeactivate();
                if (that._adminNav) that._adminNav.setActive(false);
                that._userNav.setActive(false);
            }
            if (admin) that._adminNav.setActive(v);
            else that._userNav.setActive(v);

            that.showLoading(false);

            var title = v.title;
            if (typeof(title) === "string" && title.startsWith("i18n:")) title = loc.get(title.substring(5));
            if (utils.isArray(title)) title = loc.get(title[0], title.slice(1));

            if (v.model) {
                var model = v.model;
                var p = {
                    settings: that._settings
                };
                if (utils.isArray(model)) {
                    p = model[1];
                    model = model[0];
                }
                $("#kloudspeaker-configview-header").html("").hide();
                kloudspeaker.ui.viewmodel(v.view, [model, p], that._getContentElement().empty()).done(function(m) {
                    that._activeView = m;

                    if (!noStore && v.viewId) kloudspeaker.App.storeView("admin/" + v.viewId);
                    if (!m.customTitle) $("#kloudspeaker-configview-header").html(m.title || title || '').show();
                });
            } else {
                that._activeView = v;

                if (!noStore && that._activeView.viewId) kloudspeaker.App.storeView("admin/" + that._activeView.viewId);
                $("#kloudspeaker-configview-header").html(title).show();
                v.onActivate(that._getContentElement().empty(), that);
            }
        }

        this._getContentElement = function() {
            return $("#kloudspeaker-configview-content");
        }

        this.onDeactivate = function() {
            if (that._activeView && that._activeView.onDeactivate) that._activeView.onDeactivate();
        }

        this.showLoading = function(s) {
            if (s) that._getContentElement().find(".kloudspeaker-configlistview").addClass("loading");
            else that._getContentElement().find(".kloudspeaker-configlistview").removeClass("loading");
        }
    };
});
