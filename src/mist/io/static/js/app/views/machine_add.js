define('app/views/machine_add', ['app/views/controlled'],
    /**
     *  Machine Add View
     *
     *  @returns Class
     */
    function (ControlledComponent) {
        return App.MachineAddComponent = ControlledComponent.extend({

            layoutName: 'machine_add',
            controllerName: 'machineAddController',

            changeProviderFlag: false,
            dockerNeedScript: false,
            hasAdvancedScript: false,

            hasDocker: function() {
                var provider = Mist.machineAddController.newMachineProvider;
                return provider ? (provider.provider ? (provider.provider == 'docker' ? true : false) : false) : false;
            }.property('Mist.machineAddController.newMachineProvider'),

            hasOpenstack: function() {
                var provider = Mist.machineAddController.newMachineProvider;
                return provider ? (provider.provider ? (provider.provider == 'openstack' ? true : false) : false) : false;
            }.property('Mist.machineAddController.newMachineProvider'),

            hasAzure: function() {
                var provider = Mist.machineAddController.newMachineProvider;
                return provider ? (provider.provider ? (provider.provider == 'azure' ? true : false) : false) : false;
            }.property('Mist.machineAddController.newMachineProvider'),

            hasKey: function() {
                var provider = Mist.machineAddController.newMachineProvider;
                return provider ? (provider.provider ? (provider.provider == 'docker' ? false : true) : false) : false;
            }.property('hasDocker', 'Mist.machineAddController.newMachineProvider'),

            hasScript: Ember.computed('hasKey', 'dockerNeedScript', function() {
                return this.get('hasKey') == true || this.get('dockerNeedScript');
            }),            

            hasLocation: function() {
                var provider = Mist.machineAddController.newMachineProvider,
                valids = ['docker', 'indonesiancloud', 'vcloud'];
                return provider ? (provider.provider ? (valids.indexOf(provider.provider) != -1 ? false : true) : false) : false;
            }.property('Mist.machineAddController.newMachineProvider'),

            hasNetworks: function() {
                var provider = Mist.machineAddController.newMachineProvider,
                valids = ['openstack', 'vcloud'];
                return provider ? (provider.provider ? (valids.indexOf(provider.provider) != -1 ? true : false) : false) : false;
            }.property('Mist.machineAddController.newMachineProvider'),

            hasMonitoring: Ember.computed(function() {
                return Mist.email ? true : false;
            }),


            /**
             *  Properties
             */

            price: function () {

                var image = Mist.machineAddController.newMachineImage;
                var size = Mist.machineAddController.newMachineSize;
                var provider = Mist.machineAddController.newMachineProvider;
                var location = Mist.machineAddController.newMachineLocation;

                if (!image || !image.id || !size || !size.id || !provider || !provider.id) return 0;

                try { //might fail with TypeError if no size for this image
                    if (provider.provider.indexOf('ec2') > -1) {
                        if (image.name.indexOf('SUSE Linux Enterprise') > -1)
                            return size.price.sles;
                        if (image.name.indexOf('Red Hat') > -1)
                            return size.price.rhel;
                        return size.price.linux;
                    }
                    if (provider.provider.indexOf('rackspace') > -1) {
                        if (image.name.indexOf('Red Hat') > -1)
                            return size.price.rhel;
                        if (image.name.indexOf('Vyatta') > -1)
                            return size.price.vyatta;
                        return size.price.linux;
                    }
                    if (provider.provider.indexOf('gce') > -1) {
                        if (location.name.indexOf('europe-') > -1)
                            return size.price.eu;
                        if (location.name.indexOf('us-') > -1)
                            return size.price.us;
                        if (location.name.indexOf('asia-') > -1)
                            return size.price.as;
                        return size.price.eu;
                    }
                    return size.price;

                } catch (error) {
                    return 0;
                }
            }.property('Mist.machineAddController.newMachineProvider',
                       'Mist.machineAddController.newMachineImage',
                       'Mist.machineAddController.newMachineSize',
                       'Mist.machineAddController.newMachineLocation'),


            /**
             *
             *  Initialization
             *
             */

             load: function () {
                Ember.run.next(function(){
                    $( "#create-machine" ).collapsible({
                        expand: function(event, ui) {
                            Mist.machineAddController.open(null);

                            var id = $(this).attr('id'),
                            overlay = id ? $('#' + id+'-overlay') : false;
                            if (overlay) {
                                overlay.removeClass('ui-screen-hidden').addClass('in');
                            }
                            $(this).children().next().hide();
                            $(this).children().next().slideDown(250);
                        }
                    });
                });

                // Add event listeners
                Mist.scriptsController.on('onChange', this, 'renderFields');
                Mist.keysController.on('onKeyListChange', this, 'renderFields');
                Mist.backendsController.on('onImagesChange', this, 'renderFields');

             }.on('didInsertElement'),


             unload: function () {
                Ember.run.next(function(){
                    $( "#create-machine" ).collapsible({
                        collapse: function(event, ui) {
                            Mist.machineAddController.close();

                            $(this).children().next().slideUp(250);
                            var id = $(this).attr('id'),
                            overlay = id ? $('#' + id+'-overlay') : false;
                            if (overlay) {
                                overlay.removeClass('in').addClass('ui-screen-hidden');
                            }
                        }
                    });
                });

                // Remove event listeners
                Mist.scriptsController.off('onChange', this, 'renderFields');
                Mist.keysController.off('onKeyListChange', this, 'renderFields');
                Mist.backendsController.off('onImagesChange', this, 'renderFields');

             }.on('willDestroyElement'),


            /**
             *
             *  Methods
             *
             */


             clear: function () {
                 this.$('select').val('basic').slider('refresh');
                 // this.$('.script-option').hide();
                 // this.$('.basic').show();
                 this.$('.ui-collapsible').removeClass('selected');
             },

             checkImageSelected: function(image) {
                if (image) {
                    this.triggerAction({
                        action:'selectProvider',
                        target: this,
                        actionContext: image.backend
                    });

                    this.triggerAction({
                        action:'selectImage',
                        target: this,
                        actionContext: image
                    });
                }
             },

             fieldIsReady: function (field) {
                $('#create-machine')
                    .find('.ui-collapsible')
                    .collapsible()
                    .collapsible('collapse');
                $('#create-machine-' + field).addClass('selected');
             },


             renderFields: function () {
                Ember.run.next(function () {

                    // Render collapsibles
                    if ($('.ui-collapsible').collapsible) {
                        $('.ui-collapsible').collapsible().enhanceWithin();
                    }

                    // Render listviews
                    if ($('.ui-listview').listview) {
                        $('.ui-listview').listview()
                                         .listview('refresh');
                    }
                });
             },


            showDockerMenu: function () {
                this.hideDockerMenu();
                $('#machine-create #location').hide();
                $('#machine-create #script').hide();
                $('#machine-create #size').hide();
                $('#machine-create #key').hide();
                $('#create-machine-monitoring').hide();
                $('#machine-create .docker').slideDown();
                $('#machine-create #ports').slideDown();
                Mist.machineAddController.set('fullDocker', true);
                Mist.machineAddController.set('simpleDocker', false);
            },


            showMistDockerMenu: function () {
                this.hideDockerMenu();
                $('#machine-create #location').hide();
                $('#machine-create #size').hide();
                $('#machine-create #ports').slideDown();
                Mist.machineAddController.set('fullDocker', false);
                Mist.machineAddController.set('plainDocker', true);
            },


            hideDockerMenu: function () {
                $('#machine-create #location').slideDown();
                $('#machine-create #script').slideDown();
                $('#machine-create #size').slideDown();
                $('#machine-create #key').slideDown();
                $('#create-machine-monitoring').slideDown();
                $('#machine-create .docker').hide();
                $('#machine-create #ports').hide();
            },


            showAzureMenu: function () {
                $('#machine-create .azure').slideDown();
            },


            hideAzureMenu: function () {
                $('#machine-create .azure').hide();
            },


            /**
             *
             *  Actions
             *
             */

            actions: {

                clickOverlay: function() {
                    $('#create-machine').collapsible('collapse');
                },

                switchToggled: function () {
                    var value = this.$('#script select').val();
                    Mist.machineAddController.set('newMachineScript', '');
                    Mist.machineAddController.set('newMachineScriptParams', '');
                    Mist.machineAddController.set('hasScript', value == 'advanced');
                    this.set('hasAdvancedScript', value == 'advanced');
                },


                selectProvider: function (backend) {

                    if (this.fieldIsReady) {
                        this.fieldIsReady('provider');
                    }

                    backend.networks.model.forEach(function (network, index) {
                        network.set('selected', false);
                    });
                    Mist.machineAddController.set('newMachineLocation', {'name' : 'Select Location'})
                                             .set('newMachineImage', {'name' : 'Select Image'})
                                             .set('newMachineSize', {'name' : 'Select Size'})
                                             .set('newMachineProvider', backend);

                    this.set('changeProviderFlag', true);
                    // $('#create-machine-image').slideDown();
                    // $('#create-machine-location').slideUp();
                    // $('#create-machine-size').slideUp();
                    // $('#create-machine-key').slideUp();
                    // $('#machine-create .docker textarea').slideUp();
                    // $('#machine-create .docker .ui-checkbox').slideUp();
                    // $('#create-machine-network').slideUp();
                    // $('#machine-create #ports').slideUp();

                    // if (backend.get('requiresNetworkOnCreation')) {
                    //     if (backend.networks.model.length > 0) {
                    //         $('#create-machine-network').slideDown();
                    //         $('label[for=create-machine-script]').text('Script');
                    //     }
                    // } else {
                    //     $('#create-machine-network').slideUp();
                    //     $('label[for=create-machine-script]').text('Script');
                    // }

                    var view = Mist.machineAddController.view;
                    // if (backend.get('isDocker')) {
                    //     view.showDockerMenu();
                    // } else {
                    //     view.hideDockerMenu();
                    // }

                    // if (backend.get('isAzure')) {
                    //     view.showAzureMenu();
                    // } else {
                    //     view.hideAzureMenu();
                    // }

                },


                selectImage: function (image) {

                    if (this.fieldIsReady) {
                        this.fieldIsReady('image');
                    }

                    Mist.machineAddController.set('newMachineLocation', {'name' : 'Select Location'})
                                             .set('newMachineSize', {'name' : 'Select Size'})
                                             .set('newMachineImage', image);

                    if (image.get('isMist')) {
                        this.set('dockerNeedScript', true);
                    } else {
                        this.set('dockerNeedScript', false);
                    }

                    // $('#create-machine-size').slideDown();
                    // $('#create-machine-location').slideUp();
                    // $('#create-machine-key').slideUp();

                   // var view = Mist.machineAddController.view;
                   // if (image.get('isDocker')) {
                   //     Mist.machineAddController.set('newMachineSize',
                   //          Mist.machineAddController.newMachineProvider.sizes.model[0]);
                   //     if (image.get('isMist')) {
                   //         view.showMistDockerMenu();
                   //         $('#create-machine-key').slideDown();
                   //     } else {
                   //         view.showDockerMenu();
                   //         $('#machine-create .docker textarea').slideDown();
                   //     }
                   //     $('#machine-create #ports').slideDown();
                   // }
                },


                selectSize: function (size) {

                    this.fieldIsReady('size');

                    Mist.machineAddController.set('newMachineLocation', {'name' : 'Select Location'})
                                             .set('newMachineSize', size);

                    // $('#create-machine-location').slideDown();
                    // $('#machine-create .docker textarea').slideDown();
                    // $('#machine-create .docker .ui-checkbox').slideDown();
                    // $('#create-machine-key').slideUp();

                    // Docker specific
                    // if (Mist.machineAddController.newMachineProvider.provider == 'docker')
                        // Because SSH key is optional for docker, so is location
                        // $('#create-machine-key').slideDown();
                },


                selectLocation: function (location) {

                    this.fieldIsReady('location');

                    Mist.machineAddController.set('newMachineLocation', location);
                    // $('#create-machine-key').slideDown();
                },


                selectKey: function (key) {
                    this._selectKey(key)
                },

                selectScript: function (script) {
                    Mist.machineAddController.set('newMachineScript', script);
                    $('#create-machine-script-select').collapsible('collapse');
                },

                toggleNetworkSelection: function (network) {
                    network.set('selected', !network.selected);
                    $('#create-machine-machine')
                        .collapsible('option', 'collapsedIcon', 'check')
                        .collapsible('collapse');
                },


                createKeyClicked: function () {
                    var that = this;
                    Mist.keyAddController.open(function (success, key) {
                        that._selectKey(key);
                    });
                },


                backClicked: function () {
                    Mist.machineAddController.close();
                },


                launchClicked: function () {
                    Mist.machineAddController.add();
                }
            },


            _selectKey: function (key) {

                this.fieldIsReady('key');

                Mist.machineAddController.set('newMachineKey', key);
                // $('#script').slideDown();
                // $('#create-machine-monitoring').slideDown();
            },


            /**
             *
             *  Observers
             *
             */

             bindingsObserver: function () {
                Ember.run.once(this, 'renderFields');
             }.observes('Mist.machineAddController.newMachineSize',
                        'Mist.machineAddController.newMachineImage',
                        'Mist.machineAddController.newMachineProvider',
                        'Mist.machineAddController.newMachineLocation')
        });
    }
);
