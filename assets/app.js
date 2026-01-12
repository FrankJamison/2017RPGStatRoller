(function() {
    "use strict";

    var THEME_KEY = "statroller.theme";
    var HISTORY_KEY = "statroller.history.v1";

    function $(sel) {
        return document.querySelector(sel);
    }

    function clampHistory(items) {
        var max = 12;
        if (items.length <= max) return items;
        return items.slice(0, max);
    }

    function loadHistory() {
        try {
            var raw = localStorage.getItem(HISTORY_KEY);
            if (!raw) return [];
            var parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed;
        } catch (e) {
            return [];
        }
    }

    function saveHistory(items) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(clampHistory(items)));
        } catch (e) {
            // ignore
        }
    }

    function formatWhen(ts) {
        try {
            return new Date(ts).toLocaleString();
        } catch (e) {
            return "";
        }
    }

    function ensureToast() {
        var toast = $("#toast");
        if (toast) return toast;
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
        return toast;
    }

    var toastTimer = null;

    function showToast(message) {
        var toast = ensureToast();
        toast.textContent = message;
        toast.classList.add("show");

        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }

        toastTimer = setTimeout(function() {
            toast.classList.remove("show");
        }, 1800);
    }

    function applyTheme(theme) {
        var html = document.documentElement;
        if (theme === "light") html.setAttribute("data-theme", "light");
        else html.setAttribute("data-theme", "dark");
    }

    function initThemeToggle() {
        var saved = null;
        try {
            saved = localStorage.getItem(THEME_KEY);
        } catch (e) {
            saved = null;
        }

        if (!saved) {
            // Prefer OS theme if available
            try {
                if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) saved = "light";
            } catch (e) {
                // ignore
            }
        }

        applyTheme(saved || "dark");

        var btn = $("#themeToggle");
        if (!btn) return;

        function updateLabel() {
            var current = document.documentElement.getAttribute("data-theme") || "dark";
            btn.setAttribute("aria-pressed", current === "light" ? "true" : "false");
            btn.textContent = current === "light" ? "Light" : "Dark";
        }

        updateLabel();

        btn.addEventListener("click", function() {
            var current = document.documentElement.getAttribute("data-theme") || "dark";
            var next = current === "light" ? "dark" : "light";
            applyTheme(next);
            try {
                localStorage.setItem(THEME_KEY, next);
            } catch (e) {
                // ignore
            }
            updateLabel();
        });
    }

    function renderHistory() {
        var list = $("#historyList");
        if (!list) return;

        var items = loadHistory();
        list.innerHTML = "";

        if (!items.length) {
            var empty = document.createElement("li");
            empty.className = "history-item";
            empty.innerHTML = '<div class="small">No rolls yet. Roll to populate history on this device.</div>';
            list.appendChild(empty);
            return;
        }

        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var li = document.createElement("li");
            li.className = "history-item";

            var statsDiv = document.createElement("div");
            statsDiv.className = "stats";
            if (Array.isArray(it.stats)) {
                for (var j = 0; j < it.stats.length; j++) {
                    var chip = document.createElement("span");
                    chip.className = "stat-chip";
                    chip.textContent = String(it.stats[j]);
                    statsDiv.appendChild(chip);
                }
            }

            var metaDiv = document.createElement("div");
            metaDiv.className = "meta";

            if (typeof it.pointBuy === "number") {
                var pb = document.createElement("span");
                pb.className = "badge";
                pb.innerHTML = "<strong>Point Buy</strong> <span>" + it.pointBuy + "</span>";
                metaDiv.appendChild(pb);
            }

            if (it.variant) {
                var v = document.createElement("span");
                v.className = "badge";
                v.innerHTML = "<strong>Mode</strong> <span>" + it.variant + "</span>";
                metaDiv.appendChild(v);
            }

            li.appendChild(statsDiv);
            if (metaDiv.childNodes.length) li.appendChild(metaDiv);
            list.appendChild(li);
        }
    }

    function setActionsEnabled(enabled) {
        var copyBtn = $("#copyBtn");
        if (copyBtn) copyBtn.disabled = !enabled;
    }

    function resetResultsUI() {
        var box = ensureLastResultBox();
        if (box) {
            box.innerHTML = '<p class="small">No rolls yet. Click “Roll ability scores”.</p>';
        }

        window.StatRollerUI.lastResult = null;
        setActionsEnabled(false);
    }

    function ensureLastResultBox() {
        var el = $("#results");
        return el;
    }

    function normalizeResult(result) {
        var safe = result || {};
        if (!Array.isArray(safe.stats)) safe.stats = [];
        safe.stats = safe.stats.slice();
        return safe;
    }

    function formatClipboard(result) {
        var r = normalizeResult(result);
        var parts = [];
        if (r.variant) parts.push(r.variant);
        if (r.stats.length) parts.push(r.stats.join(", "));
        if (typeof r.pointBuy === "number") parts.push("Point Buy: " + r.pointBuy);
        if (typeof r.attempts === "number" && r.attempts > 1) parts.push("Attempts: " + r.attempts);
        return parts.join(" | ");
    }

    function writeClipboard(text) {
        if (!text) return Promise.reject(new Error("Nothing to copy"));

        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise(function(resolve, reject) {
            try {
                var ta = document.createElement("textarea");
                ta.value = text;
                ta.setAttribute("readonly", "readonly");
                ta.style.position = "fixed";
                ta.style.left = "-9999px";
                document.body.appendChild(ta);
                ta.select();
                var ok = document.execCommand("copy");
                document.body.removeChild(ta);
                if (!ok) reject(new Error("Copy failed"));
                else resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

    function initActions() {
        var copyBtn = $("#copyBtn");
        var clearBtn = $("#clearBtn") || $("#clearHistoryBtn");

        if (copyBtn) {
            copyBtn.addEventListener("click", function() {
                var r = window.StatRollerUI && window.StatRollerUI.lastResult;
                writeClipboard(formatClipboard(r))
                    .then(function() {
                        showToast("Copied");
                    })
                    .catch(function() {
                        showToast("Copy failed");
                    });
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener("click", function() {
                saveHistory([]);
                renderHistory();
                resetResultsUI();
                showToast("Cleared");
            });
        }
    }

    function showResult(result) {
        var r = normalizeResult(result);
        var box = ensureLastResultBox();
        if (!box) return;

        box.innerHTML = "";

        var statsWrap = document.createElement("div");
        statsWrap.className = "stats";
        for (var i = 0; i < r.stats.length; i++) {
            var chip = document.createElement("span");
            chip.className = "stat-chip";
            chip.textContent = String(r.stats[i]);
            statsWrap.appendChild(chip);
        }

        var meta = document.createElement("div");
        meta.className = "meta";

        if (typeof r.pointBuy === "number") {
            var pb = document.createElement("span");
            pb.className = "badge";
            pb.innerHTML = "<strong>Point Buy</strong> <span>" + r.pointBuy + "</span>";
            meta.appendChild(pb);
        }

        if (r.variant) {
            var v = document.createElement("span");
            v.className = "badge";
            v.innerHTML = "<strong>Mode</strong> <span>" + r.variant + "</span>";
            meta.appendChild(v);
        }

        if (typeof r.attempts === "number" && r.attempts > 1) {
            var a = document.createElement("span");
            a.className = "badge";
            a.innerHTML = "<strong>Attempts</strong> <span>" + r.attempts + "</span>";
            meta.appendChild(a);
        }

        box.appendChild(statsWrap);
        box.appendChild(meta);

        window.StatRollerUI.lastResult = r;
        setActionsEnabled(true);

        var items = loadHistory();
        items.unshift({
            ts: Date.now(),
            stats: r.stats,
            pointBuy: typeof r.pointBuy === "number" ? r.pointBuy : undefined,
            variant: r.variant || undefined,
            attempts: typeof r.attempts === "number" ? r.attempts : undefined,
        });
        saveHistory(items);
        renderHistory();
    }

    function bindRollButton(fn) {
        var btn = $("#rollBtn");
        if (!btn) return;

        btn.addEventListener("click", function() {
            try {
                fn();
            } catch (e) {
                showToast("Roll failed");
            }
        });

        // Small keyboard helpers: R=roll, C=copy, X=clear
        document.addEventListener("keydown", function(ev) {
            if (ev.defaultPrevented) return;
            if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
            if (ev.target && (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA" || ev.target.tagName === "SELECT")) return;
            if (ev.target && ev.target.isContentEditable) return;

            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                btn.click();
                return;
            }

            if (ev.key === "c" || ev.key === "C") {
                var copyBtn = $("#copyBtn");
                if (copyBtn && !copyBtn.disabled) {
                    ev.preventDefault();
                    copyBtn.click();
                }
                return;
            }

            if (ev.key === "x" || ev.key === "X") {
                var clearBtn = $("#clearBtn") || $("#clearHistoryBtn");
                if (clearBtn) {
                    ev.preventDefault();
                    clearBtn.click();
                }
                return;
            }
        });
    }

    function initAutoBind() {
        var body = document.body;
        if (!body) return;
        var fnName = body.getAttribute("data-roll-fn");
        var argStr = body.getAttribute("data-roll-args") || "";

        if (!fnName) return;

        bindRollButton(function() {
            var fn = window[fnName];
            if (typeof fn !== "function") throw new Error("Missing roll function");
            var args = [];
            if (argStr.trim().length) {
                args = argStr
                    .split(",")
                    .map(function(s) {
                        return s.trim();
                    })
                    .filter(function(s) {
                        return s.length;
                    })
                    .map(function(s) {
                        var n = Number(s);
                        return isNaN(n) ? s : n;
                    });
            }
            fn.apply(null, args);
        });
    }

    window.StatRollerUI = {
        lastResult: null,
        showResult: showResult,
        renderHistory: renderHistory,
        showToast: showToast,
    };

    document.addEventListener("DOMContentLoaded", function() {
        initThemeToggle();
        initActions();
        initAutoBind();
        renderHistory();
        resetResultsUI();
    });
})();