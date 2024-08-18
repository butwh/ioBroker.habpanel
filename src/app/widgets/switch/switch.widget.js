(function() {
    'use strict';

    angular
        .module('app.widgets')
        .directive('widgetSwitch', widgetSwitch)
        .controller('WidgetSettingsCtrl-switch', WidgetSettingsCtrlSwitch)
        .config(function (WidgetsProvider) { 
            WidgetsProvider.$get().registerType({
                type: 'switch',
                displayName: 'Switch',
                icon: 'off',
                description: 'A ON/OFF toggle for ioBroker switches'
            });
        });

    widgetSwitch.$inject = ['$rootScope', '$uibModal', 'OHService'];
    function widgetSwitch($rootScope, $modal, OHService) {
        // Usage: <widget-Switch ng-model="widget" />
        //
        // Creates: A Switch widget
        //
        var directive = {
            bindToController: true,
            controller: SwitchController,
            controllerAs: 'vm',
            link: link,
            restrict: 'AE',
            templateUrl: 'app/widgets/switch/switch.tpl.html',
            scope: {
                ngModel: '='
            }
        };
        return directive;
        
        function link(scope, element, attrs) {
            element[0].parentElement.parentElement.className += " activefeedback";
        }
    }
    SwitchController.$inject = ['$rootScope', '$scope', 'OHService'];
    function SwitchController ($rootScope, $scope, OHService) {
        var vm = this;
        this.widget = this.ngModel;

        function updateValue() {
            var item = OHService.getItem(vm.widget.item);
            if (!item || item.state === vm.value) return;
            
            if (item.state !== true && item.state !== false && item.state !== 'true' && item.state !== 'false' && item.state !== 0 && item.state !== 1 && item.state !== '0' && item.state !== '1') {
                // deal with non bool values being sent to switchitems...
                var parts = item.state.split(',');

                if (parts.length === 3 && parseInt(parts[2]) > 0) {
                    // HSB value with brightness > 0
                    vm.value = true;
                } else if (parts.length === 1 && parseInt(parts[0]) > 0) {
                    // numerical value (assuming brightness) > 0
                    vm.value = true;
                } else {
                    vm.value = false;
                }
            } else {
                item.state = (item.state === true || item.state === 'true' || item.state === 1 || item.state === '1');
                vm.value = OHService.getItem(vm.widget.item).state;
            }
            vm.label = vm.value ? 'ON' : 'OFF';

        }

        OHService.onUpdate($scope, vm.widget.item, function () {
            updateValue();
        });

        vm.toggleSwitch = function () {
            if (vm.value === true) {
                OHService.sendCmd(this.widget.itemset, false);
            } else {
                OHService.sendCmd(this.widget.itemset, true);
            }
        };

        vm.valueAsBool = function () {
            return vm.value === true;
        }
    }

    // settings dialog
    WidgetSettingsCtrlSwitch.$inject = ['$scope', '$timeout', '$rootScope', '$uibModalInstance', 'widget', 'OHService'];

    function WidgetSettingsCtrlSwitch($scope, $timeout, $rootScope, $modalInstance, widget, OHService) {
        $scope.widget = widget;
        // $scope.items = OHService.getItems();

        $scope.form = {
            name            : widget.name,
            sizeX           : widget.sizeX,
            sizeY           : widget.sizeY,
            col             : widget.col,
            row             : widget.row,
            item            : widget.item,
            hidelabel       : widget.hidelabel,
            hideicon        : widget.hideicon,
            hideonoff       : widget.hideonoff,
            backdrop_iconset: widget.backdrop_iconset,
            backdrop_icon   : widget.backdrop_icon,
            backdrop_center : widget.backdrop_center,
            iconset         : widget.iconset,
            icon            : widget.icon,
            icon_size       : widget.icon_size,
            itemset         : widget.itemset
        };
        
        $scope.$watch('form.item', function (item, oldItem) {
            if (item === oldItem) {
                return;
            }
            OHService.getObject(item).then(function (obj) {
                if (obj && obj.common) {
                    if (obj.common.name) {
                        $scope.form.name = obj.common.name;
                    }
                }
            });
        });
        
        $scope.dismiss = function() {
            $modalInstance.dismiss();
        };

        $scope.remove = function() {
            $scope.dashboard.widgets.splice($scope.dashboard.widgets.indexOf(widget), 1);
            $modalInstance.close();
        };

        $scope.submit = function() {
            angular.extend(widget, $scope.form);
            $modalInstance.close(widget);
        };
    }
})();
