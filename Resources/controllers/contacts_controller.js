Otlet.Controller("Contacts", {
  $private: ["initialize", "ready"],
  initialize: function () {
    if(!$.is_ready)
      Otlet.Application.listen("ready", this.ready, this);
    
    this.me = Contact.find_first("@me".loc());
    if(!this.me)
      this.me = Contact.create({
        nick: "@me".loc(),
        full_name: "me".loc(),
        fields: new Hash()
      });

    this.current_contact = null;
    this.is_editing = false;
    
    Contact.listen("change", contactChanged, this);
    Contact.listen("new",    contactNew,     this);
    Contact.listen("delete", contactDeleted, this);
    
    if(Otlet.Application.dock_menu) {
      Otlet.Application.dock_menu.addItem("New Contact", this.method("create"));
    }
  },
  ready: function () {
    $("#content").append(this.render("index", {
      contacts: Otlet.util.sort_by("full_name", "as", Contact.find()),
      faves: Otlet.util.sortByListPositionAsc(Contact.faves())
    }));
    this.controlls("div#contacts.page").siblings().hide();
    
    $(window).resize();

    this.container
      .find("#sel_contacts_list")
      .sortable({
        delay: 120,
        distance: $("#contacts .sidebar:first li:first").height()/2,
        update: Otlet.util.update_sortable_list("Contact", function (i, $el) {
          return Contact.find_first($el.find("a").attr("href").split("/show/")[1]);
        }),
        start: Otlet.util.sortableStartInSidebar,
        beforeStop: Otlet.util.sortableBeforeStopInSidebar,
        revert: 120
      });
  },
  index: function () {
    this.all();
  },
  all: function () {
    this.activeSidebarItem = this.container.find("a[href$=/all]");
    showContactsList();
  },
  me: function () {
    this.show("@me".loc());
  },
  show: function (id) {
    if(this.is_editing)
      return window.history.go(-1);
    
    var contact = Contact.find_first(id);
    if(!contact)
      return alert("There is no contact with nickname @" + id);

    this.current_contact = contact;
    this.activeContactItem = findContactElement(this.current_contact);
    if(this.current_contact.is_fave()) {
      this.activeSidebarItem = this.container.find("#sel_contacts_list a[href$=/show/" + id + "]");
      hideContactsList();
    }

    this.render("contact", {contact: this.current_contact}, "#contacts_body");
    $("#contact_photo_wrapper").disableSelection();
    $("#contact_edit_bar").disableSelection();
  },
  create: function () {
    hideContactsList();
    this.activeSidebarItem = this.container.find("a[href$=/create]");
    this.current_contact = "create_me";

    var fake_contact = {
      id: "create_me",
      full_name: "(none)".loc(),
      email: "(none)".loc(),
      photo: function () { return "/images/icons/user.png" },
      attr: function (attr) { return this[attr] },
      fields: new Hash(),
      field: function (f) { return undefined }
    }

    this.render("contact", {contact: fake_contact}, "#contacts_body");
    this.is_editing = true;
    $("#contact_edit_bar a[href^=#Contacts/edit]")
      .text("done [action]".loc())
      .parent()
        .addClass("active");
    $("#contacts_body")
      .addClass("editing");
    $(".editable:first")[0].focus();
  },
  cancel_create: function () {
    $("#contacts_body").html("").removeClass("editing");
    this.is_editing = false;
    window.location.hash = "#Contacts";
  },
  edit: function (id) {
    var was_created = false;
    if(id === "create_me") {
      var nick = $(".editable[alt=nick]").text().trim(),
          full_name = $(".editable[alt=full_name]").text().trim();

      id = Contact.storeAndCreate({
        nick: nick,
        full_name: full_name,
        fields: new Hash(),
        list_position: null,
        location_id: nick + "-" + "#home".loc()
      }).id;
      was_created = true;
    } else {
      this.hide_current_hash("Contacts/show/" + id);
    }

    var contact = Contact.find_first(id),
        $toggle_button = $("#contact_edit_bar a[href^=#Contacts/edit]");

    if(this.is_editing) {
      var can_stop_editing = true
      $("#contacts_body")
        .removeClass("editing")
        .find(".editable").each(function (m, el) {
          if(!el.className.contains("edit"))
            return false;

          var attr = $(el).attr("alt");
          if(!attr)
            return false;
          if(attr.contains("field_"))
            contact.set_field(attr.split("field_")[1], el.innerHTML.trim());
          else
            if(attr == "nick" && !el.innerText.trim().length) {
              $(el).effect("highlight", {color: "#f00"}, 270)[0].focus();
              can_stop_editing = false;
            } else
              contact.update(attr, el.innerText.trim());

          return true;
        });

      if(can_stop_editing)
          $toggle_button.text("edit".loc()).parent().removeClass("active");

    } else {
      $toggle_button.text("done [action]".loc()).parent().addClass("active");
      $("#contacts_body").addClass("editing");
      $(".editable:first")[0].focus();
    }

    this.is_editing = !this.is_editing;
  },
  change_photo: function (id) {
    this.hide_current_hash("Contacts/show/" + id);
    if(!this.is_editing)
      return false;

    var contact = Contact.find_first(id);
    Titanium.UI.openFileChooserDialog(function (paths) {
      var path = paths[0];
      if(path) {
        path = "file://" + path;
        var img = new Image();
        img.src = path;

        if(id !== "create_me")
          contact.update("photo_path", path);
        else {
          $(".field_val[alt=photo_path]").text(path);
          $("#contact_photo")
            .css("opacity", 0)
            .attr("src", path)
            .animate({opacity: 1}, 270);
        }
      }
    }, {
      multiple: false,
      directories: false,
      files: true,
      types: ["png", "jpg", "jpeg", "tiff", "gif", "bmp"]
    });
  },
  add_field: function () {
    if(!this.is_editing)
      return false;

    if(this.current_contact !== "create_me")
      this.hide_current_hash("Contacts/show/" + this.current_contact.id);
    else
      this.hide_current_hash("Contacts/edit");

    var k = $("#new_field_name").text().trim(),
        v = $("#new_field_value").html().trim();

    if(!k.length)
      return false;

    if(this.current_contact !== "create_me")
      this.current_contact
        .update("fields", $.H(this.current_contact.attr("fields")).set(k, v));

    this.container
      .find("#contact_details p.actions")
        .before(this.render("field", {
          field: k,
          value: v,
          is_property: false
        }))
      .find(".editable")
        .text(" ")[0].focus();
  },
  remove_field: function (id) {
    if(!this.is_editing)
      return false;
    this.current_contact.update("fields", $.H(this.current_contact.attr("fields")).del(id));
    findFieldElement(id).hide("slide", {direction: "up"}, 270, $.removeWhenDone);
  },
  del: function (id) {
    if(id !== this.me.id) {
      Contact.find_first(id).del();
      window.location.hash = "Contacts/next"
    }
  },
  toggle_fave: function (id) {
    this.hide_current_hash("Contacts/show/" + id);
    var contact = Contact.find_first(id);
    
    if(contact.is_fave())
      contact.update("list_position", null);
    else
      contact.update("list_position", Contact.faves().length);

  },
  prev: function () {
    window.location.hash = this.activeContactItem.prev().find("a").attr("href");
  },
  next: function () {
    window.location.hash = this.activeContactItem.next().find("a").attr("href");
  },
  show_on_map: function (id) {
    window.location.hash = "#Places/show/" + id + "-" + "#home".loc();
  },
  
  send_mail_to: function (id) {
    Titanium.Desktop.openURL("mailto:" + Contact.find_first(id).attr("email"));
  },
  setActiveSidebarItem: function (el) {
    this.activeSidebarItem.removeClass("active");
    return el.parent().addClass("active");
  },
  getActiveSidebarItem: function () {
    return this.container.find("div.sidebar:first li.active");
  },
  setActiveContactItem: function (el) {
    this.activeContactItem.removeClass("active");
    return el.parent().addClass("active");
  },
  getActiveContactItem: function () {
    return this.container.find("#contacts_list li.contact.active");
  }
});


/*** Private methods ***/
/** Shortcuts **/
var Contact = Otlet.model.Contact;

function C (controller) {
  return Otlet.Controller(controller || "Contacts");
}

/** Event callbacks **/
function contactChanged(e, contact, changed) {
  if("nick" in changed) {
    $("#contacts_list")[0].outerHTML = this.render("sidebar", {
      contacts: Otlet.util.sortByDateAsc(Contact.find())
    });
  }
  if("photo_path" in changed) {
    var photo = contact.photo();
    
    findContactElements(contact).each(function (n, el) {
      $(el).find("img.contact_photo").data("next_photo", photo)[0]
        .style.WebkitAnimationName = "scale-down";
    });
    
    if(isContactActive(contact)) {
      $("#contact_photo")
        .css("opacity", 0)
        .attr("src", photo)
        .animate({opacity: 1}, 270);
      $("#contact_photo_wrapper span").text(contact.photo().split("/").last());
    }
  }
  if("full_name" in changed) {
    var $el = findContactElement(contact),
        var was_active = $el.hasClass("active");

    $el[0].outerHTML = this.render("sidebar_contact", {contact:contact});
    if(was_active)
      C().activeConactItem = $el.find("a");

    $("a.contact").text(contact.attr("full_name"));
  }
  if("list_position" in changed) {
    var is_fave = contact.is_fave(),
        was_fave = changed.list_position !== null;

    // Did it just change it's position in the list?
    if(!(was_fave && is_fave)) {
      if(isContactActive(contact))
        $("#contact_toggle_fave")[is_fave ? "addClass" : "removeClass"]("active");
    
      // Going from fave to underdog
      if(was_fave && !is_fave)
        $("#sel_contacts_list a[href$=Contacts/show/" + contact.id + "]")
          .parent()
            .fadeOut(270, $.removeWhenDone);

      // Rising their social status again
      if(!was_fave && is_fave)
        return $("#sel_contacts_list")
          .append(this.render("sidebar_contact", {
            contact: contact
          })
        );
    }
  }
}

function contactNew(e, contact) {
  $("#contacts_list ul").append(this.render("sidebar_contact", {contact: contact}));
  window.location.hash = "Contacts/show/" + contact.id;
}

function contactDeleted(e, contact) {
  findContactElements(contact).fadeOut(120, $.removeWhenDone);

  var $el = $("#contacts_body"),
      to = $("#trash_drop").offset(),
      from = $el.offset();
  
  Otlet.Controller("Trash")._open_trash();
  $("#contact_edit_bar").fadeOut(120, $.removeWhenDone);
  
  from.position = "absolute";
  from.width = $el.width();
  from.height = $el.height();
  from.opacity = 0; // WebKit animation handles this
  to.left = (to.left - from.left)/2;
  to.top *= 2;
  $el[0].style.WebkitTransform = _("translate(0, {top}px) scale(0)", to);

  setTimeout(function () {
    Otlet.util.poof("#trashcan_anim");
  }, 270);

  setTimeout(function () {
    Otlet.Controller("Trash")._close_trash();
    $el.html("").removeAttr("style");
  }, 360);
  
  if(isContactActive(contact))
    window.location.hash = $("#contacts_list .contact:first a").attr("href");
}

/** HTML helpers **/
function listContacts () {
  
}

function showContactsList () {
  $("#contacts_body").css("marginLeft", 302);
  $("#contacts_list:hidden").show("slide", {direction: "left"}, 270);
}

function hideContactsList () {
  $("#contacts_list:visible").hide("slide", {direction: "left"}, 270);
  $("#contacts_body").css("marginLeft", 151);
}

function isContactActive (contact) {
  return C().current_contact.id == String.is(contact) ? contact : contact.id;
}

function findContactElement (contact) {
  if(!String.is(contact))
    contact = contact.id;
  return $("#contacts_list a[href$=Contacts/show/" + contact + "]");
}

function findContactElements (contact) {
  if(!String.is(contact))
    contact = contact.id;
  return $("#contacts a[href$=Contacts/show/" + contact + "]");
}

function findFieldElement (field) {
  var fields = $("#contact_details .field .field_name"),
      n = fields.length;

  while(n--)
    if(fields[n].innerText.trim() === field)
      return $(fields[n]).parent();
}

function focusNextEditable (e) {
  if(e.keyCode !== Event.KEY_TAB || e.keyCode !== Event.KEY_RETURN)
    return true;

  Event.kill(e);
  $(".editable:focus").next(".editable")[0].focus();

  return false;
}

/** WebKit animations **/
window.onwebkitanimationend =  function(e) {
  switch (e.animationName) {
    case "scale-down":
      var $el = $(e.target),
          next_photo = $el.data("next_photo");

      if(next_photo) {
        $el.attr("src", next_photo).data("next_photo", null);
        e.target.style.WebkitAnimationName = "scale-up";
        break;
      }
      break;
    case "scale-up":
      e.target.style.WebkitAnimationName = "";
      break;
  }
};