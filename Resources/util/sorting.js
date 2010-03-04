$.extend(Otlet.util, {
  update_sortable_list: function (model, finder) {
    return function (ui) {
      var $this = $(this),
          list = $this.sortable("toArray"),
          n = list.length,
          obj;

      while(n--) {
        obj = finder(list[n], $this);
        if(!obj || obj.attr("list_position") === n)
          continue;

        obj.update({list_position: n});
      }
    }
  },
  sortableStart: function (e, ui) {
    ui.helper.addClass("dragging");
  },
  sortableBeforeStop: function (e, ui) {
    ui.helper.removeClass("dragging");
  },
  sortableStartInSidebar: function (e, ui) {
    ui.helper.addClass("dragging");
    $(".sidebar").css("overflow", "");
  },
  sortableBeforeStopInSidebar: function (e, ui) {
    ui.helper.removeClass("dragging");
    $(".sidebar").css("overflow", "auto");
  },
  sort_method: function (attr, order) {
    if(order.toLowerCase() === "asc")
      return function (items) {
        return items.sort(function (a, b) {
          return a.attr(attr) - b.attr(attr);
        })
      }
    else
      return function (items) {
        return items.sort(function (a, b) {
          return b.attr(attr) - a.attr(attr);
        })
      }
  },
  sort_by: function (attr, order, items) {
    return this.sort_method(attr, order)(items);
  },
  sortByDateAsc: function (items) {
    return _sort_date_asc(items);
  },
  sortByDateDesc: function (items) {
    return _sort_date_desc(items);
  },
  sortByListPositionAsc: function (items) {
    return _sort_list_pos_asc(items);
  },
  sortByListPositionDesc: function (items) {
    return _sort_list_pos_desc(items);
  }
});

var _sort_date_asc = Otlet.util.sort_method("created_at", "asc"),
    _sort_date_desc = Otlet.util.sort_method("created_at", "desc"),
    _sort_list_pos_asc = Otlet.util.sort_method("list_position", "asc"),
    _sort_list_pos_desc = Otlet.util.sort_method("list_position", "desc");