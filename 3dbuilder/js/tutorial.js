/**
 * Cubik Builder - Tutorial Module
 * Driver.js v5.3
 * @version 1.3 - Mobile descriptions (navigation, place, delete, editor, Save/Load/Continue), no hotkeys on mobile
 */
(function(global) {
  'use strict';

  var COOKIE_NAME = 'cubik_tour_completed';
  var COOKIE_MAX_AGE_DAYS = 365 * 10; // ~10 years (persistent)
  var driverInstance = null;
  var isActive = false;
  var currentStepListeners = [];
  var actionCompleted = false;
  var currentStepIndex = -1;

  function t(key, fallback) {
    if (global.CubikI18N && typeof global.CubikI18N.t === 'function') {
      return global.CubikI18N.t(key, fallback);
    }
    return fallback || key;
  }

  function isTouchMode() {
    return global.CubikMobile && typeof global.CubikMobile.isTouchMode === 'function' && global.CubikMobile.isTouchMode();
  }

  function desc(key, desktopFallback, mobileFallback) {
    if (isTouchMode()) {
      return t(key + '.mobile', mobileFallback || desktopFallback);
    }
    return t(key, desktopFallback);
  }

  function getCookie(name) {
    try {
      var parts = ('; ' + (document.cookie || '')).split('; ' + name + '=');
      if (parts.length === 2) return (parts.pop() || '').split(';').shift() || '';
    } catch (e) {}
    return '';
  }

  function setCookie(name, value, days) {
    try {
      var expires = '';
      if (days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + d.toUTCString();
      }
      document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Lax';
      return true;
    } catch (e) {
      console.warn('[Tutorial] setCookie failed:', e);
      return false;
    }
  }

  function deleteCookie(name) {
    try {
      document.cookie = name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      return true;
    } catch (e) {}
    return false;
  }

  function isTourCompleted() {
    try {
      return getCookie(COOKIE_NAME) === 'true';
    } catch (e) {
      console.warn('[Tutorial] Cookie access failed:', e);
      return false;
    }
  }

  function markTourCompleted() {
    try {
      setCookie(COOKIE_NAME, 'true', COOKIE_MAX_AGE_DAYS);
    } catch (e) {
      console.warn('[Tutorial] Failed to mark tutorial as completed:', e);
    }
  }

  function resetTourStatus() {
    try {
      deleteCookie(COOKIE_NAME);
      console.log('[Tutorial] Reset');
    } catch (e) {}
  }

  function getSceneCanvas() {
    var canvas = document.querySelector('canvas#scene') ||
                 document.querySelector('canvas#sceneCanvas') ||
                 document.querySelector('#app > canvas') ||
                 document.querySelector('body > canvas');
    
    if (canvas) return canvas;
    
    var allCanvases = document.querySelectorAll('canvas');
    var mainCanvas = null;
    var maxArea = 0;
    
    allCanvases.forEach(function(c) {
      if (c.closest('#gallery') || c.closest('.card') || c.closest('#editor')) return;
      var area = c.offsetWidth * c.offsetHeight;
      if (area > maxArea) { maxArea = area; mainCanvas = c; }
    });
    
    return mainCanvas;
  }

  function cleanupStepListeners() {
    currentStepListeners.forEach(function(item) {
      if (item.element && item.handler) {
        item.element.removeEventListener(item.event, item.handler, item.options);
      }
    });
    currentStepListeners = [];
    actionCompleted = false;
  }

  function addStepListener(element, event, handler, options) {
    if (!element) return;
    element.addEventListener(event, handler, options);
    currentStepListeners.push({ element: element, event: event, handler: handler, options: options });
  }

  function goNext() {
    if (actionCompleted || !isActive || !driverInstance) return;
    
    var stepWhenCalled = currentStepIndex;
    actionCompleted = true;
    
    setTimeout(function() {
      if (!isActive || !driverInstance) { actionCompleted = false; return; }
      if (currentStepIndex !== stepWhenCalled && stepWhenCalled !== -1) { actionCompleted = false; return; }
      
      try {
        if (typeof driverInstance.moveNext === 'function') {
          console.log('[Tutorial] Auto-advance from step', currentStepIndex);
          driverInstance.moveNext();
        }
      } catch (e) {
        console.error('[Tutorial] Advance error:', e);
        actionCompleted = false;
      }
    }, 400);
  }

  /**
   * Auto-advance setup
   * Steps: 0-Welcome, 1-Gallery, 2-Palette, 3-Place, 4-Navigate, 5-Delete, 
   *        6-OpenEditor, 7-SelectFace, 8-FaceType, 9-Replace, 10-FaceColor,
   *        11-ExitEditor, 12-UndoRedo, 13-SaveLoad, 14-Continue, 15-Finish
   */
  function setupStepAutoAdvance(stepIndex) {
    cleanupStepListeners();
    var canvas = getSceneCanvas();
    
    console.log('[Tutorial] Setup step', stepIndex, 'canvas:', canvas ? 'found' : 'NOT FOUND');
    
    switch(stepIndex) {
      case 1: // Gallery
        var gallery = document.getElementById('gallery');
        if (gallery) {
          addStepListener(gallery, 'click', function(e) {
            if (e.target.closest('.card')) { console.log('[Tutorial] Block selected'); goNext(); }
          });
        }
        break;
        
      case 2: // Palette
        var palette = document.getElementById('palette');
        if (palette) {
          addStepListener(palette, 'click', function(e) {
            if (e.target.closest('.dot')) { console.log('[Tutorial] Color selected'); goNext(); }
          });
        }
        break;
        
      case 3: // Place block
        if (canvas) {
          addStepListener(canvas, 'pointerup', function(e) {
            if (e.button === 0) { console.log('[Tutorial] Block placed'); goNext(); }
          });
        }
        break;
        
      case 4: // Navigation
        if (canvas) {
          var startX = 0, startY = 0, isDragging = false;
          addStepListener(canvas, 'pointerdown', function(e) {
            if (e.button === 0) { isDragging = true; startX = e.clientX; startY = e.clientY; }
          });
          addStepListener(canvas, 'pointermove', function(e) {
            if (isDragging && (Math.abs(e.clientX - startX) > 20 || Math.abs(e.clientY - startY) > 20)) {
              console.log('[Tutorial] Camera moved'); goNext();
            }
          });
          addStepListener(canvas, 'pointerup', function() { isDragging = false; });
          addStepListener(canvas, 'wheel', function() { console.log('[Tutorial] Zoom'); goNext(); }, { passive: true });
        }
        break;
        
      case 5: // Delete
        if (canvas) {
          addStepListener(canvas, 'contextmenu', function() { console.log('[Tutorial] Delete'); goNext(); });
        }
        break;
        
      case 6: // Open editor
        addStepListener(document, 'keydown', function(e) {
          if (e.key === 'Tab') { console.log('[Tutorial] Tab'); goNext(); }
        });
        if (canvas) {
          addStepListener(canvas, 'pointerdown', function(e) {
            if (e.button === 1) { console.log('[Tutorial] Middle click'); goNext(); }
          });
        }
        break;
        
      case 7: // Select face
        var previewWrap = document.getElementById('previewWrap');
        if (previewWrap) {
          addStepListener(previewWrap, 'click', function() { console.log('[Tutorial] Face selected'); goNext(); });
        }
        break;
        
      case 8: // Face type
        var faceGallery = document.getElementById('faceTypeGallery');
        if (faceGallery) {
          addStepListener(faceGallery, 'click', function() { console.log('[Tutorial] Face type'); goNext(); });
        }
        break;
        
      case 9: // Replace
        var replaceBtn = document.getElementById('replaceBtn');
        if (replaceBtn) {
          addStepListener(replaceBtn, 'click', function() { console.log('[Tutorial] Replace'); goNext(); });
        }
        break;
        
      case 10: // Face color
        var paletteFace = document.getElementById('paletteFace');
        if (paletteFace) {
          addStepListener(paletteFace, 'click', function(e) {
            if (e.target.closest('.dot')) { console.log('[Tutorial] Face color'); goNext(); }
          });
        }
        break;
        
      case 11: // Exit editor
        if (canvas) {
          addStepListener(canvas, 'pointerup', function() { console.log('[Tutorial] Exit editor'); goNext(); });
        }
        break;
        
      // 12: Undo/Redo - informational, no auto-advance
      // 13: Save/Load - informational, no auto-advance
      // 14: Continue - informational, no auto-advance
      // 15: Finish - Done button handled separately
    }
  }

  function getTourSteps() {
    var canvasStep = function(popoverConfig) {
      return {
        element: getSceneCanvas(),
        _isCanvasStep: true,
        popover: popoverConfig
      };
    };

    return [
      // 0: Welcome
      {
        popover: {
          title: t('tutorial.welcome.title', 'Добро пожаловать в Cubik Builder!'),
          description: t('tutorial.welcome.desc', 'Это интерактивное руководство поможет вам создавать 3D модели.\n\nНажмите «Далее» чтобы начать.'),
          popoverClass: 'tutorial-welcome'
        }
      },

      // 1: Gallery
      {
        element: '#gallery',
        popover: {
          title: t('tutorial.gallery.title', 'Галерея блоков'),
          description: t('tutorial.gallery.desc', 'Выберите тип блока кликнув на него.'),
          side: 'right',
          align: 'start'
        }
      },

      // 2: Palette
      {
        element: '#palette',
        popover: {
          title: t('tutorial.palette.title', 'Палитра цветов'),
          description: t('tutorial.palette.desc', 'Выберите цвет кликнув на точку.'),
          side: 'right',
          align: 'center'
        }
      },

      // 3: Place block
      canvasStep({
        title: t('tutorial.place.title', 'Размещение блоков'),
        description: desc('tutorial.place.desc', 'Кликните левой кнопкой мыши на сцену чтобы разместить блок.', 'Коснитесь сцены, чтобы поставить выбранный блок. Блоки прилипают к сетке и друг к другу.'),
        side: 'over',
        align: 'center'
      }),

      // 4: Navigation
      canvasStep({
        title: t('tutorial.navigate.title', 'Навигация камеры'),
        description: desc('tutorial.navigate.desc', 'Вращение: зажмите ЛКМ и двигайте мышь\nПеремещение: зажмите ПКМ\nМасштаб: колёсико мыши', 'Вращение: двигайте одним пальцем. Масштаб: щипок двумя пальцами.'),
        side: 'over',
        align: 'center'
      }),

      // 5: Delete
      canvasStep({
        title: t('tutorial.delete.title', 'Удаление блоков'),
        description: desc('tutorial.delete.desc', 'Кликните правой кнопкой мыши на блок чтобы удалить его.', 'Длинное нажатие на блок → меню → «Удалить куб».'),
        side: 'over',
        align: 'center'
      }),

      // 6: Open editor
      canvasStep({
        title: t('tutorial.openEditor.title', 'Редактор граней'),
        description: desc('tutorial.openEditor.desc', 'Наведите на блок и нажмите Tab или среднюю кнопку мыши.', 'Длинное нажатие на блок → в меню выберите «Редактировать».'),
        side: 'over',
        align: 'center',
        onNextClick: function() {
          var editor = document.getElementById('editor');
          var isEditorVisible = editor && editor.classList.contains('open');
          
          if (!isEditorVisible) {
            console.log('[Tutorial] Opening editor...');
            
            // Check if there's a block to edit
            var objects = window.getObjects ? window.getObjects() : [];
            
            if (objects.length > 0) {
              // Select first block if none selected
              if (!window.selectedBlock && window.selectBlock) {
                window.selectBlock(objects[0]);
              }
              
              // Open editor using exported function
              if (window.openEditor) {
                window.openEditor();
              } else {
                // Fallback: CSS classes
                if (editor) editor.className = 'open';
                document.body.classList.add('editor-open');
              }
            }
          }
          
          setTimeout(function() {
            if (window.CubikTutorial) window.CubikTutorial.nextStep();
          }, 150);
        }
      }),

      // 7: Select face
      {
        element: '#previewWrap',
        popover: {
          title: t('tutorial.editorSelectFace.title', 'Выбор грани'),
          description: t('tutorial.editorSelectFace.desc', 'Кликните на грань блока которую хотите изменить.'),
          side: 'left',
          align: 'center',
          onPrevClick: function() {
            // Close editor when going back
            if (window.closeEditor) {
              window.closeEditor();
            } else {
              var editor = document.getElementById('editor');
              if (editor) editor.className = '';
              document.body.classList.remove('editor-open');
            }
            
            if (window.CubikTutorial) window.CubikTutorial.prevStep();
          }
        }
      },

      // 8: Face type
      {
        element: '#faceTypeGallery',
        popover: {
          title: t('tutorial.editorFaceType.title', 'Выбор замены'),
          description: t('tutorial.editorFaceType.desc', 'Выберите декоративный элемент для грани.'),
          side: 'left',
          align: 'start'
        }
      },

      // 9: Replace
      {
        element: '#replaceBtn',
        popover: {
          title: t('tutorial.editorApply.title', 'Применить'),
          description: t('tutorial.editorApply.desc', 'Нажмите кнопку Replace для применения.'),
          side: 'left',
          align: 'center'
        }
      },

      // 10: Face color
      {
        element: '#paletteFace',
        popover: {
          title: t('tutorial.editorColor.title', 'Face Color'),
          description: t('tutorial.editorColor.desc', 'Optionally select a color for the face. Click on any color.'),
          side: 'left',
          align: 'center',
          onNextClick: function() {
            // Close editor after face color step before moving to next step
            if (window.closeEditor) {
              window.closeEditor();
            } else {
              var editor = document.getElementById('editor');
              if (editor) editor.className = '';
              document.body.classList.remove('editor-open');
            }
            
            // Move to next step after closing editor
            setTimeout(function() {
              if (window.CubikTutorial) {
                window.CubikTutorial.nextStep();
              }
            }, 150);
          }
        }
      },

      // 11: Exit editor
      canvasStep({
        title: t('tutorial.editorExit.title', 'Выход из редактора'),
        description: desc('tutorial.editorExit.desc', 'Кликните по пустому месту на сцене чтобы закрыть редактор.', 'Нажмите стрелку свёртывания (◀) или коснитесь области вне панели редактора.'),
        side: 'over',
        align: 'center'
      }),

      // 12: Undo/Redo
      {
        element: '.panel-actions',
        popover: {
          title: t('tutorial.undoredo.title', 'Отмена и повтор'),
          description: desc('tutorial.undoredo.desc', 'Отмена: Ctrl+Z\nПовтор: Ctrl+Y\n\nКнопка с корзиной очищает всю сцену.', 'Используйте эти кнопки для отмены и повтора. Корзина очищает сцену. На мобиле горячих клавиш нет.'),
          side: 'right',
          align: 'start'
        }
      },

      // 13: Save/Load — подсветка #hudBar (на десктопе в шапке, на мобиле внизу; не ставить position:relative на #hudBar в CSS)
      {
        element: '#hudBar',
        popover: {
          title: t('tutorial.saveload.title', 'Сохранение и загрузка'),
          description: desc('tutorial.saveload.desc', 'Сохраняйте проект в файл и загружайте сохранённые проекты.', 'Внизу экрана: Load — открыть файл, Save — скачать проект. Кнопка Continue там же (след. шаг).'),
          side: 'bottom',
          align: 'center'
        }
      },

      // 14: Continue — подсветка кнопки (на мобиле она в той же панели внизу)
      {
        element: '#continueBtn',
        popover: {
          title: t('tutorial.continue.title', 'Сохранить в аккаунт'),
          description: desc('tutorial.continue.desc', 'Нажмите Continue чтобы сохранить проект в аккаунт для покупки.', 'Нажмите Continue в панели внизу экрана, чтобы сохранить в аккаунт и перейти в магазин.'),
          side: 'top',
          align: 'end'
        }
      },

      // 15: Finish (last step - should show Done button)
      {
        popover: {
          title: t('tutorial.finish.title', 'You\'re Ready!'),
          description: t('tutorial.finish.desc', 'Great job! You now know the basics. Start building your creation! You can always restart this tutorial from the Help button.'),
          popoverClass: 'tutorial-welcome',
          onNextClick: function() {
            console.log('[Tutorial] Finish - Done clicked');
            markTourCompleted();
            if (driverInstance) {
              driverInstance.destroy();
            }
          }
        }
      }
    ];
  }

  function getDriverConfig() {
    return {
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      
      overlayOpacity: 0.5,
      overlayColor: '#000',
      
      stagePadding: 8,
      stageRadius: 8,
      popoverOffset: 15,
      
      disableActiveInteraction: false,
      
      nextBtnText: t('tutorial.btn.next', 'Далее →'),
      prevBtnText: t('tutorial.btn.prev', '← Назад'),
      doneBtnText: t('tutorial.btn.done', 'Готово!'),
      progressText: '{{current}} / {{total}}',
      
      onHighlightStarted: function(element, step, options) {
        cleanupStepListeners();
        actionCompleted = false;
      },
      
      onHighlighted: function(element, step, options) {
        var stepIndex = options && options.state ? options.state.activeIndex : 0;
        var totalSteps = options && options.state && options.state.steps ? options.state.steps.length : 0;
        currentStepIndex = stepIndex;
        
        console.log('[Tutorial] Step', stepIndex, 'of', totalSteps, 'element:', element ? (element.id || element.tagName) : 'none');
        
        // Update button texts when language changes
        updateDriverButtonTexts();
        
        // Replace Next with Done on last step
        if (totalSteps > 0 && stepIndex === totalSteps - 1) {
          setTimeout(function() {
            var nextBtn = document.querySelector('.driver-popover-next-btn');
            if (nextBtn) {
              nextBtn.textContent = t('tutorial.btn.done', 'Done!');
            }
          }, 100);
        }
        
        var overlay = document.querySelector('.driver-overlay');
        if (overlay) overlay.style.pointerEvents = 'none';
        
        var canvas = getSceneCanvas();
        if (canvas) canvas.style.pointerEvents = 'auto';
        
        // For editor steps (7-10), ensure editor is open
        if (stepIndex >= 7 && stepIndex <= 10) {
          var editor = document.getElementById('editor');
          var isEditorVisible = editor && editor.classList.contains('open');
          
          if (!isEditorVisible) {
            console.log('[Tutorial] Editor not visible on step', stepIndex, '- opening...');
            
            var objects = window.getObjects ? window.getObjects() : [];
            
            if (objects.length > 0) {
              // Select first block if none selected
              if (!window.selectedBlock && window.selectBlock) {
                window.selectBlock(objects[0]);
              }
              
              // Open editor
              if (window.openEditor) {
                window.openEditor();
              } else {
                if (editor) editor.className = 'open';
                document.body.classList.add('editor-open');
              }
            }
          }
        }
        
        setupStepAutoAdvance(stepIndex);
      },
      
      onDeselected: function(element, step, options) {
        if (!options) return;
        var stepIndex = (options.state && options.state.activeIndex) || 0;
        var totalSteps = (options.state && options.state.steps) ? options.state.steps.length : 0;
        if (totalSteps > 0 && stepIndex === totalSteps - 1) markTourCompleted();
      },
      
      onDestroyStarted: function() {
        console.log('[Tutorial] Close requested...');
        cleanupStepListeners();
        document.body.classList.remove('tutorial-active');
        isActive = false;
        var canvas = getSceneCanvas();
        if (canvas) { canvas.style.zIndex = ''; canvas.style.pointerEvents = ''; }
        var instance = driverInstance;
        driverInstance = null;
        if (instance && typeof instance.destroy === 'function') {
          instance.destroy();
        }
      },
      
      onDestroyed: function() {
        console.log('[Tutorial] Destroyed');
        isActive = false;
        currentStepIndex = -1;
        markTourCompleted();
        driverInstance = null;
      }
    };
  }

  function startTour(force) {
    var driverFactory = null;
    if (global.driver && global.driver.js && typeof global.driver.js.driver === 'function') {
      driverFactory = global.driver.js.driver;
    } else if (typeof global.driver === 'function') {
      driverFactory = global.driver;
    }
    
    if (!driverFactory) { console.error('[Tutorial] Driver.js not loaded'); return; }
    if (!force && isTourCompleted()) { console.log('[Tutorial] Already completed'); return; }

    if (driverInstance) { try { driverInstance.destroy(); } catch (e) {} driverInstance = null; }
    if (global.CubikUI && global.CubikUI.isHelpOpen()) global.CubikUI.closeHelp();

    setTimeout(function() {
      try {
        var config = getDriverConfig();
        var steps = getTourSteps();
        
        steps = steps.map(function(step) {
          if (step._isCanvasStep) {
            var canvas = getSceneCanvas();
            if (canvas) {
              console.log('[Tutorial] Canvas step resolved');
              return Object.assign({}, step, { element: canvas });
            }
          }
          return step;
        });
        
        config.steps = steps;
        driverInstance = driverFactory(config);
        
        document.body.classList.add('tutorial-active');
        isActive = true;
        
        driverInstance.drive();
        console.log('[Tutorial] Started with', steps.length, 'steps');
      } catch (e) {
        console.error('[Tutorial] Start error:', e);
        document.body.classList.remove('tutorial-active');
        isActive = false;
      }
    }, 300);
  }

  function updateDriverButtonTexts() {
    if (!driverInstance || !isActive) return;
    
    try {
      var nextBtn = document.querySelector('.driver-popover-next-btn');
      var prevBtn = document.querySelector('.driver-popover-prev-btn');
      var doneBtn = document.querySelector('.driver-popover-done-btn');
      
      if (nextBtn) nextBtn.textContent = t('tutorial.btn.next', 'Далее →');
      if (prevBtn) prevBtn.textContent = t('tutorial.btn.prev', '← Назад');
      if (doneBtn) doneBtn.textContent = t('tutorial.btn.done', 'Готово!');
    } catch (e) {
      console.warn('[Tutorial] Failed to update button texts:', e);
    }
  }

  function stopTour() {
    cleanupStepListeners();
    if (driverInstance) { try { driverInstance.destroy(); } catch (e) {} driverInstance = null; }
    document.body.classList.remove('tutorial-active');
    isActive = false;
    currentStepIndex = -1;
    var canvas = getSceneCanvas();
    if (canvas) { canvas.style.zIndex = ''; canvas.style.pointerEvents = ''; }
    console.log('[Tutorial] Stopped');
  }

  function init() {
    // Listen for language changes to update button texts
    if (document.addEventListener) {
      document.addEventListener('i18n:langChanged', function() {
        if (isActive) {
          updateDriverButtonTexts();
        }
      });
    }
    
    setTimeout(function() {
      if (!isTourCompleted()) {
        console.log('[Tutorial] First visit - starting tutorial');
        startTour(false);
      } else {
        console.log('[Tutorial] Returning user');
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  global.CubikTutorial = {
    start: startTour,
    stop: stopTour,
    isActive: function() { return isActive; },
    isCompleted: isTourCompleted,
    reset: resetTourStatus,
    goToStep: function(i) { if (driverInstance) driverInstance.drive(i); },
    nextStep: function() { if (driverInstance && isActive) try { driverInstance.moveNext(); } catch(e){} },
    prevStep: function() { if (driverInstance && isActive) try { driverInstance.movePrevious(); } catch(e){} },
    init: init
  };

})(window);
