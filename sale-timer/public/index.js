var DUR = 72 * 3600 * 1000,
    ids = ["d", "h", "m", "s"],
    els = {},
    timer,
    start = 0,
    end = 0,
    offset = 0,
    local = false,
    code = "SAVE40",
    mem = null;
ids.forEach(function (k) {
    els[k] = document.getElementById(k);
});
var banner = document.getElementById("banner"),
    box = document.getElementById("box"),
    msg = document.getElementById("msg");
function $(i) {
    return document.getElementById(i);
}
function pad(n) {
    return String(n).padStart(2, "0");
}

// scrolling strip
var t = "FLAT 40% OFF ✦ FREE DELIVERY ✦ LIMITED STOCK ✦ ".repeat(4);
$("mq").innerHTML = "<span>" + t + "</span><span>" + t + "</span>";

// ---- demo mode storage (used only when the server is not running) ----
function ls() {
    var s = null;
    try {
        s = JSON.parse(localStorage.getItem("sale"));
    } catch (e) {
        s = mem;
    }
    if (!s || !s.end) {
        s = { start: Date.now(), end: Date.now() + DUR, claims: 128 };
        sv(s);
    }
    return s;
}
function sv(s) {
    mem = s;
    try {
        localStorage.setItem("sale", JSON.stringify(s));
    } catch (e) {}
}

// ---- talk to backend ----
function api(url, opt) {
    return fetch(url, opt).then(function (r) {
        if (!r.ok && r.status !== 410) throw 0;
        return r.json().then(function (d) {
            return { ok: r.ok, d: d };
        });
    });
}

function setOffer(s, e, off, c, cd) {
    start = s;
    end = e;
    offset = off;
    code = cd;
    $("claims").textContent = c;
    $("coupon").textContent = cd;
    $("code2").textContent = cd;
    $("mode").textContent = local ? "Demo mode (no server)" : "Live from server";
    banner.classList.remove("ended");
    clearInterval(timer);
    update();
    timer = setInterval(update, 1000);
}

function loadOffer() {
    return api("/api/offer")
        .then(function (r) {
            local = false;
            var o = r.d;
            setOffer(o.startTime, o.endTime, o.serverTime - Date.now(), o.claims, o.code);
        })
        .catch(function () {
            local = true;
            var s = ls();
            setOffer(s.start, s.end, 0, s.claims, "SAVE40");
        });
}

function update() {
    var diff = end - (Date.now() + offset);
    if (diff <= 0) {
        clearInterval(timer);
        $("fill").style.width = "0%";
        banner.classList.add("ended");
        return;
    }
    var s = Math.floor(diff / 1000);
    var v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    banner.classList.toggle("urgent", s < 3600);
    $("fill").style.width = Math.min(100, (diff / (end - start)) * 100) + "%";
    $("left").textContent = v.d + "d " + pad(v.h) + "h " + pad(v.m) + "m " + pad(v.s) + "s";
    ids.forEach(function (k) {
        var x = pad(v[k]);
        if (els[k].textContent !== x) {
            els[k].textContent = x;
            els[k].classList.remove("flip");
            void els[k].offsetWidth;
            els[k].classList.add("flip");
        }
    });
}

function claim() {
    if (!local) return api("/api/claim", { method: "POST" });
    var s = ls();
    if (Date.now() >= s.end) return Promise.resolve({ ok: false, d: { message: "Sorry, this sale has ended." } });
    s.claims++;
    sv(s);
    return Promise.resolve({ ok: true, d: { code: "SAVE40", claims: s.claims } });
}

// ---- confetti ----
function confetti() {
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    var c = $("fx"),
        x = c.getContext("2d"),
        cols = ["#ff3b30", "#ffd93b", "#141414", "#2b6bff", "#18c964"],
        p = [],
        n = 0;
    c.width = innerWidth;
    c.height = innerHeight;
    for (var i = 0; i < 150; i++)
        p.push({
            x: innerWidth / 2,
            y: innerHeight * 0.6,
            vx: (Math.random() - 0.5) * 18,
            vy: -Math.random() * 17 - 4,
            s: Math.random() * 8 + 5,
            c: cols[i % 5],
            r: Math.random() * 6,
        });
    (function f() {
        x.clearRect(0, 0, c.width, c.height);
        p.forEach(function (q) {
            q.vy += 0.35;
            q.x += q.vx;
            q.y += q.vy;
            q.r += 0.2;
            x.save();
            x.translate(q.x, q.y);
            x.rotate(q.r);
            x.fillStyle = q.c;
            x.fillRect(-q.s / 2, -q.s / 2, q.s, q.s * 0.6);
            x.restore();
        });
        if (++n < 130) requestAnimationFrame(f);
        else x.clearRect(0, 0, c.width, c.height);
    })();
}

// ---- buttons ----
$("shop").onclick = function () {
    claim()
        .then(function (r) {
            if (!r.ok) {
                alert(r.d.message);
                return;
            }
            $("claims").textContent = r.d.claims;
            $("code2").textContent = r.d.code;
            msg.textContent = "";
            confetti();
            box.showModal();
        })
        .catch(function () {
            alert("Cannot reach the server. Run: npm start");
        });
};
$("restart").onclick = function () {
    if (local) {
        sv({ start: Date.now(), end: Date.now() + DUR, claims: 128 });
        loadOffer();
    } else
        api("/api/restart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hours: 72 }),
        }).then(loadOffer);
};
$("close").onclick = function () {
    box.close();
};
box.addEventListener("click", function (e) {
    if (e.target === box) box.close();
});
$("copy").onclick = function () {
    try {
        navigator.clipboard.writeText(code).then(
            function () {
                msg.textContent = "Copied: " + code;
            },
            function () {
                msg.textContent = "Select and copy: " + code;
            }
        );
    } catch (e) {
        msg.textContent = "Select and copy: " + code;
    }
};

loadOffer();
