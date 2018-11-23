/**
 * Nazca Draggable v0.1.0
 * Nazca JS Graphic Editor
 * @author Mikhail Baranovsky <mihrootk@gmail.com>
 * Copyright (c) 2014-2015 Mikhail Baranovsky
 */

(function($) {
  var version = '0.1.0';

  //small hack of clicks after mouseup
  let
    clickLock = false,
    dragHappens = false,
    lastDragDistance = [0, 0];

  const hack = event => {
    if (clickLock) {
      event.stopImmediatePropagation();
    }
  };

  var methods = {};

  var touch = false;
  //Is touch events supported?
  if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
    touch = true;
  }

  console.log('Touch Events: ' + (touch ? 'supported' : 'not supported'));

  // Plugin definition.
  $.fn.nzc_draggable = function(method) {
    if (typeof(method) === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else {
      $.error('Method ' + method + ' does not exists.');
    }
  };

  /**
   * [init description]
   * @param  {[type]} opts [description]
   * @return {[type]}      [description]
   */
  methods.init = function(opts) {
    return this.each(function() {
      var $e = $(this);
      var data = opts || {};

      $e.get(0).addEventListener('click', hack, true);
      $e.get(0).addEventListener('dblclick', hack, true);

      if (touch) {
        $e.bind('touchstart', data, _mouse_down_touch_start);
      }
      //30.09.2015 - закоментил, так как есть ноуты с тач скринами и управлением мышью
      //else {
      $e.bind('dragstart', function() {
        return false;
      });
      $e.bind('mousedown', data, _mouse_down_touch_start);
      //}

      //Set some unque ID of that attachment operation
      $e.attr('data-dgh-id', _getRandomInt(1, 1000000000));
      if (opts.parent_only_draggable) {
        //do not drag when, for example, user tries to select text
        $e.addClass('parent-only-draggable');
      }
      //$e.find('*').addClass('dgh-child');
    });
  };

  /**
   * [reset description]
   * @return {[type]} [description]
   */
  methods.reset = function() {
    return this.each(function() {
      var $e = $(this);

      if (touch) {
        $e.unbind('touchstart');
      }
      //else {
      $e.unbind('dragstart');
      $e.unbind('mousedown');
      //}

      $e.removeAttr('data-dgh-id');
      $e.removeClass('parent-only-draggable');

      $e.get(0).removeEventListener('click', hack, true);
      $e.get(0).removeEventListener('dblclick', hack, true);
      //$e.find('*').removeClass('dgh-child');
    });
  };

  /**
   * [_mouse_down_touch_start description]
   * @param  {Object} jq_e jQuery event
   * @return {boolean}
   */
  function _mouse_down_touch_start(jq_e) {
    //Allow only left button click & only one finger if touch
    if ((jq_e.button && jq_e.button !== 1) || (jq_e.originalEvent && jq_e.originalEvent.targetTouches && jq_e.originalEvent.targetTouches.length !== 1)) {
      return true;
    }

    //If target element was added after handlers attachment(for example, textarea plugin), SKIP dragging..
    //unque ID of event handlers attachment operation
    var _dgh_id = $(this).attr('data-dgh-id');
    var $_target = $(jq_e.target);

    var _attr_dgh_id = $_target.attr('data-dgh-id');

    if (_attr_dgh_id && _dgh_id !== _attr_dgh_id) {
      return true;
    } else if (!_attr_dgh_id) {
      $_target = $_target.parents('[data-dgh-id="' + _dgh_id + '"]');
      if (!$_target.length || $_target.hasClass('parent-only-draggable')) {
        return true;
      }
    }

    //IE hack
    // if($_target.hasClass('dgh-child')) {
    //   $_target = $_target.parents('[data-dgh-id="'+_dgh_id+'"]');
    //   if(!$_target.length) {
    //     return true;
    //   }
    // } else if(_dgh_id !== $_target.attr('data-dgh-id')) {
    //   return true;
    // }

    var _dragging = false;

    var draggable = jq_e.data.draggable || this;
    var $draggable = $(draggable);

    var container = jq_e.data.container || $draggable.parent().get(0);

    var onDragStart = jq_e.data.onDragStart || null;
    var onDrag = jq_e.data.onDrag || null;
    var onDragEnd = jq_e.data.onDragEnd || null;

    var e = jq_e.originalEvent;

    //Get thumb element coords
    var draggableCoords = _getCoords(draggable);
    var containerCoords = _getCoords(container);

    var pageX = typeof e.pageX !== 'undefined' ?  e.pageX : e.touches[0].clientX;
    var pageY = typeof e.pageY !== 'undefined' ?  e.pageY : e.touches[0].clientY;

    var shiftX = pageX - draggableCoords.left;
    var shiftY = pageY - draggableCoords.top;

    //save PageX, PageY during movement; TouchEnd event don't return coords

    var startLeft = pageX - shiftX - containerCoords.left;
    var startTop = pageY - shiftY - containerCoords.top;
    var newLeft = startLeft;
    var newTop = startTop;

    //Call onDragStart() if set
    if (onDragStart) {
      onDragStart.call(draggable, {
        position: [startLeft, startTop],
        event: e
      });
    }

    //Mouse move || Touch move
    var _mMoveTMove = function(e) {
      //Remove IOS overscroll, etc.
      if (touch) {
        e.preventDefault();
        e.stopPropagation();
      }

      //Dragging state trigger
      _dragging = true;

      e = e.originalEvent;

      pageX = typeof e.pageX !== 'undefined' ? e.pageX : e.touches[0].clientX;
      pageY = typeof e.pageY !== 'undefined' ? e.pageY : e.touches[0].clientY;

      //  вычесть координату родителя, т.к. position: relative
      newLeft = pageX - shiftX - containerCoords.left;
      newTop = pageY - shiftY - containerCoords.top;

      //Call onDrag() if set
      const distance = [newLeft - startLeft, newTop - startTop];

      //check that cursor really moves
      if (lastDragDistance[0] === distance[0] && lastDragDistance[1] === distance[1]) {
        return;
      } else {
        lastDragDistance[0] = distance[0];
        lastDragDistance[1] = distance[1];
        dragHappens = true;
      }

      if (onDrag) {
        onDrag.call(draggable, {
          position: [newLeft, newTop],
          distance: [newLeft - startLeft, newTop - startTop],
          event: e
        });
      } else {
        draggable.style.left = newLeft + 'px';
        draggable.style.top = newTop + 'px';
        draggable.style.right = 'auto';
        draggable.style.bottom = 'auto';
      }
    };

    //Mouse up || Touch end
    var _mUpTEnd = function(e) {
      _dragging = false;

      /*var newLeft      = pageX - shiftX - containerCoords.left;
      var rightEdge    = container.offsetWidth - draggable.offsetWidth;*/

      if (touch) {
        $('body').unbind('touchmove.nazcaEleDrag', _mMoveTMove);
        $('body').unbind('touchend.nazcaEleDrag', _mUpTEnd);
      }
      //else {
      $(document).unbind('mousemove.nazcaEleDrag', _mMoveTMove);
      $(document).unbind('mouseup.nazcaEleDrag', _mUpTEnd);
      //}

      //Call onDragEnd() if set
      const dx = newLeft - startLeft, dy = newTop - startTop;
      if (onDragEnd) {
        onDragEnd.call(draggable, {
          position: [newLeft, newTop],
          distance: [newLeft - startLeft, newTop - startTop],
          event: e,
          dragHappens
        });
      }

      if (dx || dy) {
        clickLock = true;
        setTimeout(() => {
          clickLock = false;
          dragHappens = false;
        }, 0);
      }
    };

    //Unbind
    if (touch) {
      $('body').bind('touchmove.nazcaEleDrag', _mMoveTMove);
      $('body').bind('touchend.nazcaEleDrag', _mUpTEnd);
    }
    //else {
    $(document).bind('mousemove.nazcaEleDrag', _mMoveTMove);
    $(document).bind('mouseup.nazcaEleDrag', _mUpTEnd);
    //}
    return true;
  }

  /**
   * Used in drag'n'drop/touch features
   * from http://learn.javascript.ru/play/tutorial/browser/events/slider-simple/index.html
   * @param {Objet} Event
   * @return {Objet} Event
   * @private
   */
  function _fixEvent(e) {
    e = e || window.event;

    if (!e.target) e.target = e.srcElement;

    if (typeof(e.touches) != 'undefined' && e.touches.length == 1) {
      delete e.pageX;
      delete e.pageY;

      e.pageX = e.touches[0].pageX;
      e.pageY = e.touches[0].pageY;
    } else {
      if (e.pageX === null && e.clientX !== null) { // если нет pageX..
        var html = document.documentElement;
        var body = document.body;

        e.pageX = e.clientX + (html.scrollLeft || body && body.scrollLeft || 0);
        e.pageX -= html.clientLeft || 0;

        e.pageY = e.clientY + (html.scrollTop || body && body.scrollTop || 0);
        e.pageY -= html.clientTop || 0;
      }

      if (!e.which && e.button) {
        e.which = e.button & 1 ? 1 : ( e.button & 2 ? 3 : ( e.button & 4 ? 2 : 0 ) );
      }
    }

    return e;
  }

  /**
   * Used in drag'n'drop/touch features
   * @param {Object} DOMElement
   * @return {Objet} Element position
   * @private
   */
  function _getCoords(elem) {
    var box = elem.getBoundingClientRect();

    var body = document.body;
    var docElem = document.documentElement;

    var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
    var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

    var clientTop = docElem.clientTop || body.clientTop || 0;
    var clientLeft = docElem.clientLeft || body.clientLeft || 0;

    var top = box.top + scrollTop - clientTop;
    var left = box.left + scrollLeft - clientLeft;

    return { top: Math.round(top), left: Math.round(left) };
  }

  // Returns a random integer between min (included) and max (excluded)
  // Using Math.round() will give you a non-uniform distribution!
  function _getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
}(jQuery));
