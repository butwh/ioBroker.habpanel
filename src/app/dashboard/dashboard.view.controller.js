  angular
        .module('app')
        .controller('DashboardViewCtrl', DashboardViewController);

  DashboardViewController.$inject = ['$scope', '$location', '$rootScope', '$routeParams', '$timeout', 'dashboard', 'PersistenceService', 'OHService', 'Fullscreen', 'snapRemote', 'SpeechService', 'TranslationService'];
  function DashboardViewController($scope, $location, $rootScope, $routeParams, $timeout, dashboard, PersistenceService, OHService, Fullscreen, snapRemote, SpeechService, TranslationService) {
    var vm = this;
    vm.dashboard = dashboard;
    vm.speakTooltip = TranslationService.translate('dashboard.toolbar.speak', 'Speak');
    vm.refreshTooltip = TranslationService.translate('dashboard.toolbar.refresh', 'Refresh');
    vm.fullscreenTooltip = TranslationService.translate('dashboard.toolbar.fullscreen', 'Fullscreen');
    
    // Auto-return to "Dash" dashboard after 5 minutes of inactivity
    var autoReturnTimer = null;
    var AUTO_RETURN_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds
    var TARGET_DASHBOARD = 'Dash'; // Name des Ziel-Dashboards
    
    // Auto-fullscreen every 5 minutes
    var autoFullscreenTimer = null;
    var AUTO_FULLSCREEN_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    console.log('HABPanel Auto-Return: Aktuelles Dashboard:', dashboard.id);
    
    vm.gridsterOptions = {
        margins: (vm.dashboard.widget_margin) ?
                    [vm.dashboard.widget_margin, vm.dashboard.widget_margin] : [5, 5],
        columns: vm.dashboard.columns || 12,
        rowHeight: vm.dashboard.row_height || 'match',
        pushing: false,
        floating: false,
        mobileModeEnabled: (vm.dashboard.mobile_mode_enabled || false),
        mobileBreakpoint: (vm.dashboard.mobile_mode_enabled && vm.dashboard.mobile_breakpoint || undefined),
        draggable: { enabled: false },
        resizable: { enabled: false }
    };

    var fullscreenhandler = Fullscreen.$on('FBFullscreen.change', function (evt, enabled) {
        vm.fullscreen = enabled;
    });
    var resizehandler = $scope.$on('gridster-resized', function () {
        $scope.$broadcast('rzSliderForceRender');
    });

    $scope.$on('$destroy', function() {
        fullscreenhandler();
        resizehandler();
        // Clean up auto-return timer
        if (autoReturnTimer) {
            $timeout.cancel(autoReturnTimer);
            autoReturnTimer = null;
        }
        // Clean up auto-fullscreen timer
        if (autoFullscreenTimer) {
            $timeout.cancel(autoFullscreenTimer);
            autoFullscreenTimer = null;
        }
        // Remove event listeners
        angular.element(document).off('click touchstart', resetAutoReturnTimer);
    });

    OHService.onUpdate($scope, '', function () {
        vm.ready = true;
        // for sliders
        $timeout(function () {
            $scope.$broadcast('rzSliderForceRender');
        });
    });

    activate();

    ////////////////

    function activate() {
        $timeout(function() {
            OHService.reloadItems();
            OHService.getLocale();
        });
        if ($rootScope.settings.no_scrolling) iNoBounce.enable(); else iNoBounce.disable();
        if ($routeParams.kiosk) $rootScope.kioskMode = ($routeParams.kiosk == 'on');
        if ($rootScope.kioskMode) {
            snapRemote.getSnapper().then(function (snapper) {
                snapper.disable();
            })
        }
        
        // Automatically enter fullscreen mode on page load
        $timeout(function() {
            if (!Fullscreen.isEnabled()) {
                console.log('HABPanel Auto-Return: Aktiviere Vollbildmodus nach Reload');
                // Fix for Chrome 71+ fullscreen
                if (Element.prototype.webkitRequestFullscreen) {
                    Element.prototype.webkitRequestFullscreen = function () { this.requestFullscreen(); }
                }
                Fullscreen.all();
            }
        }, 1000);
        
        // Start auto-return timer if not on the target dashboard
        startAutoReturnTimer();
        
        // Start auto-fullscreen timer
        startAutoFullscreenTimer();
        
        // Reset timer on user interactions
        angular.element(document).on('click touchstart', resetAutoReturnTimer);
    }
    
    function startAutoReturnTimer() {
        // Only start timer if we're NOT on the target dashboard
        if (dashboard.id !== TARGET_DASHBOARD) {
            console.log('HABPanel Auto-Return: Timer gestartet für', AUTO_RETURN_DELAY / 1000, 'Sekunden');
            autoReturnTimer = $timeout(function() {
                console.log('HABPanel Auto-Return: Zeit abgelaufen! Wechsle zu', TARGET_DASHBOARD);
                // Navigate to target dashboard
                $location.url('/view/' + TARGET_DASHBOARD);
                
                // Enter fullscreen mode after navigation completes
                $timeout(function() {
                    if (!Fullscreen.isEnabled()) {
                        console.log('HABPanel Auto-Return: Aktiviere Vollbildmodus nach Wechsel zu Dash');
                        // Fix for Chrome 71+ fullscreen
                        if (Element.prototype.webkitRequestFullscreen) {
                            Element.prototype.webkitRequestFullscreen = function () { this.requestFullscreen(); }
                        }
                        Fullscreen.all();
                    }
                }, 1000);
            }, AUTO_RETURN_DELAY);
        } else {
            console.log('HABPanel Auto-Return: Bin bereits auf Ziel-Dashboard, kein Timer');
        }
    }
    
    function resetAutoReturnTimer() {
        console.log('HABPanel Auto-Return: Benutzeraktivität erkannt, Timer zurücksetzen');
        // Cancel existing timer
        if (autoReturnTimer) {
            $timeout.cancel(autoReturnTimer);
            autoReturnTimer = null;
        }
        
        // Restart timer if not on target dashboard
        if (dashboard.id !== TARGET_DASHBOARD) {
            startAutoReturnTimer();
        }
    }
    
    function startAutoFullscreenTimer() {
        console.log('HABPanel Auto-Fullscreen: Timer gestartet (alle', AUTO_FULLSCREEN_INTERVAL / 1000, 'Sekunden)');
        
        function enableFullscreen() {
            if (!Fullscreen.isEnabled()) {
                console.log('HABPanel Auto-Fullscreen: Aktiviere Vollbildmodus');
                // Fix for Chrome 71+ fullscreen
                if (Element.prototype.webkitRequestFullscreen) {
                    Element.prototype.webkitRequestFullscreen = function () { this.requestFullscreen(); }
                }
                Fullscreen.all();
            }
            
            // Schedule next fullscreen check
            autoFullscreenTimer = $timeout(enableFullscreen, AUTO_FULLSCREEN_INTERVAL);
        }
        
        // Start the recurring timer
        autoFullscreenTimer = $timeout(enableFullscreen, AUTO_FULLSCREEN_INTERVAL);
    }

    vm.refresh = function() {
        OHService.reloadItems();
    };

    vm.goFullscreen = function() {
        // fix for Chrome 71+ fullscreen
        Element.prototype.webkitRequestFullscreen = function () { this.requestFullscreen(); }

        Fullscreen.toggleAll();
    };

    vm.toggleEdit = function() {
        $location.url("/edit/" + dashboard.id);
    };


    // Speech recognition
    vm.isListening = false;
    vm.supportsSpeech = SpeechService.isSpeechRecognitionSupported();

    vm.listen = function() {
        if (!vm.supportsSpeech) {
            console.error('No support for speech recognition on this platform!');
            return;
        }

        vm.speechOutput = TranslationService.translate('dashboard.speaknow', 'Speak now...');

        var stopListener = $rootScope.$on('speech-recognition', function (e, args) {
            if (args.interim_transcript) {
                vm.speechOutput = args.interim_transcript;
            } else if (args.final_transcript) {
                vm.speechOutput = args.final_transcript;
                OHService.sendVoice(vm.speechOutput);
                SpeechService.stopSpeechRecognition();
            } else if (args.stop_listening) {
                stopListener();
                $timeout(function () {
                    vm.isListening = false;
                }, 2000);
            } else if (args.error) {
                vm.speechOutput = TranslationService.translate('dashboard.speakerror', 'Error: ') + args.error;
                SpeechService.stopSpeechRecognition();
            }
        });

        OHService.getLocale().then(function (locale) {
            vm.isListening = true;
            SpeechService.startSpeechRecognition(locale);
        });
    };

    vm.stopListening = function () {
        SpeechService.stopSpeechRecognition();
    }
  }
