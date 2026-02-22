(function () {
  if (typeof window.rojoin === "undefined") {
    showToast("IPC not available.", "error");
    return;
  }
  const api = window.rojoin;

  function showToast(message, type) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.className = "toast " + (type || "info") + " show";
    clearTimeout(el._tid);
    el._tid = setTimeout(function () {
      el.classList.remove("show");
    }, 3200);
  }

  function setTab(tabId) {
    document.querySelectorAll(".sidebar-item").forEach(function (t) {
      var isActive = t.getAttribute("data-tab") === tabId;
      t.classList.toggle("active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("active", p.id === "panel-" + tabId);
    });
  }
  document.querySelectorAll(".sidebar-item").forEach(function (t) {
    t.addEventListener("click", function () {
      setTab(t.getAttribute("data-tab"));
    });
  });

  var activePresetId = null;

  function renderPresetList(list) {
    var listEl = document.getElementById("presetList");
    var emptyEl = document.getElementById("emptyPresets");
    listEl.innerHTML = "";
    if (!list || list.length === 0) {
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";
    list.forEach(function (c, i) {
      var li = document.createElement("li");
      li.className = "preset-item" + (c.id === activePresetId ? " active" : "");
      li.innerHTML =
        '<div class="preset-info">' +
          '<div class="preset-name">' + escapeHtml(c.name) + '</div>' +
          '<div class="preset-place">' + escapeHtml(c.placeId) + '</div>' +
        '</div>' +
        '<div class="preset-actions">' +
          '<button type="button" class="btn btn-primary btn-sm btn-set-active" data-id="' + escapeAttr(c.id) + '">Use</button>' +
          '<button type="button" class="btn btn-ghost btn-sm btn-join" data-place="' + escapeAttr(c.placeId) + '">Join</button>' +
          '<button type="button" class="btn btn-danger btn-sm btn-delete" data-id="' + escapeAttr(c.id) + '">Delete</button>' +
        '</div>';
      listEl.appendChild(li);
    });
    listEl.querySelectorAll(".btn-set-active").forEach(function (btn) {
      btn.addEventListener("click", function () { setActivePreset(btn.getAttribute("data-id")); });
    });
    listEl.querySelectorAll(".btn-join").forEach(function (btn) {
      btn.addEventListener("click", function () {
        joinServer(btn.getAttribute("data-place"));
      });
    });
    listEl.querySelectorAll(".btn-delete").forEach(function (btn) {
      btn.addEventListener("click", function () { deletePreset(btn.getAttribute("data-id")); });
    });
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function refreshPresets() {
    api.config.getActive().then(function (res) {
      activePresetId = (res.success && res.data) ? res.data.id : null;
      api.config.list().then(function (r) {
        if (r.success && r.data && r.data.length) {
          renderPresetList(r.data);
        } else {
          document.getElementById("presetList").innerHTML = "";
          document.getElementById("emptyPresets").style.display = "block";
        }
      });
    });
  }

  function setActivePreset(id) {
    api.config.setActive({ id: id }).then(function (res) {
      if (res.success) {
        activePresetId = id;
        api.config.list().then(function (r) {
          if (r.success && r.data) renderPresetList(r.data);
        });
        showToast("Active preset updated.", "success");
      } else {
        showToast(res.error || "Failed.", "error");
      }
    });
  }

  function deletePreset(id) {
    api.config.delete({ id: id }).then(function (res) {
      if (res.success) {
        if (activePresetId === id) activePresetId = null;
        refreshPresets();
        showToast("Preset removed.", "success");
      } else {
        showToast(res.error || "Failed.", "error");
      }
    });
  }

  function joinServer(placeId) {
    showToast("Joining…", "info");
    api.server.join(placeId ? { placeId: placeId } : {}).then(function (res) {
      showToast(res.success ? "Launched Roblox." : (res.error || "Join failed."), res.success ? "success" : "error");
    });
  }

  document.getElementById("btnAddPreset").addEventListener("click", function () {
    var nameEl = document.getElementById("newName");
    var placeEl = document.getElementById("newPlaceId");
    var name = nameEl.value.trim();
    var placeId = placeEl.value.trim();
    if (!name || !placeId) {
      showToast("Enter name and Game ID.", "error");
      return;
    }
    api.config.create({ name: name, placeId: placeId }).then(function (res) {
      if (res.success) {
        nameEl.value = "";
        placeEl.value = "";
        refreshPresets();
        showToast("Preset added.", "success");
      } else {
        showToast(res.error || "Failed.", "error");
      }
    });
  });

  function buildAcceleratorFromEvent(e) {
    var parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Command");
    var key = e.key;
    if (key.length === 1) key = key.toUpperCase();
    else if (key === " ") key = "Space";
    else if (key.startsWith("F") && /^F\d{1,2}$/i.test(key)) key = "F" + key.slice(1).toUpperCase();
    if (key && ["Control", "Alt", "Shift", "Meta"].indexOf(key) === -1) parts.push(key);
    return parts.join("+");
  }

  function loadKeybind() {
    api.keybind.get().then(function (res) {
      if (res.success && res.data) {
        var k = res.data.keybind || "";
        document.getElementById("currentKeybind").textContent = k ? k : "—";
      }
    });
  }

  document.getElementById("btnSetKeybind").addEventListener("click", function () {
    var listeningEl = document.getElementById("keybindListening");
    var btn = document.getElementById("btnSetKeybind");
    if (listeningEl.style.display === "block") return;
    listeningEl.style.display = "block";
    btn.disabled = true;
    function stopListening() {
      listeningEl.style.display = "none";
      btn.disabled = false;
      window.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      e.preventDefault();
      e.stopPropagation();
      var acc = buildAcceleratorFromEvent(e);
      if (!acc) return;
      stopListening();
      api.keybind.set({ keybind: acc }).then(function (res) {
        if (res.success) {
          document.getElementById("currentKeybind").textContent = res.data.keybind || "—";
          showToast("Keybind set to " + (res.data.keybind || acc), "success");
        } else {
          showToast(res.error || "Keybind not set.", "error");
        }
        loadKeybind();
      });
    }
    window.addEventListener("keydown", onKey, true);
  });

  refreshPresets();
  loadKeybind();
})();
