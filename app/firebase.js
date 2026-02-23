import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, 
    serverTimestamp, writeBatch, query, where, collection, 
    deleteField, Timestamp, limit, orderBy, 
    initializeFirestore, persistentLocalCache, getCountFromServer, persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC94QWRaFu0o60kDSU8Uz0VJAcXwaDWjlI",
    authDomain: "xfetishhub.firebaseapp.com",
    projectId: "xfetishhub",
    storageBucket: "xfetishhub.firebasestorage.app",
    messagingSenderId: "617015941952",
    appId: "1:617015941952:web:4f75df1239b0c114d8f8a5"
};

const ADMIN_UID = "Tqk5aauZ8JVzQ4Bs7Z0BCT5dZKf1";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
window.auth = auth;
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager() 
    })
});
let cachedUserProfile = null;
window.cachedUserProfile = null; 
let lastProfileReadTime = 0;
const provider = new GoogleAuthProvider();

let syncTimeout = null;

const PROFILE_CACHE_TTL = 60000; 

// Глобальное состояние входа
window.isUserLoggedIn = false;

// --- ЛОГИКА СПОНСОРОВ (BESTIE) ---

window.openSponsorsModal = async function() {
    const list = document.getElementById('sponsors-list');
    const inputBlock = document.getElementById('sponsor-input-container');
    
    list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">Loading legends...</div>';
    document.getElementById('modal-sponsors-overlay').classList.add('open');

    // Проверяем, нужно ли показывать поле ввода
    if (inputBlock) {
        inputBlock.style.display = 'none';
        
        // Читаем подписку из localStorage (так надежнее для синхронного кода)
        const currentSub = localStorage.getItem('xch_sub_level') || 'free';
        
        // Если Bestie и имя еще не установлено (проверяем глобальную переменную)
        if (window.isUserLoggedIn && 
            currentSub === 'bestie' && 
            window.cachedUserProfile && !window.cachedUserProfile.sponsorNameSet) {
            
            inputBlock.style.display = 'block';
        }
    }

    try {
        // Запрос к базе (теперь query и collection доступны из импорта)
        const q = query(collection(db, "sponsors_public"), orderBy("timestamp", "desc"), limit(100));
        const querySnapshot = await getDocs(q);
        
        list.innerHTML = ''; 

        // 1. Старые спонсоры (из массива в коде)
        if (typeof earlySponsors !== 'undefined') {
            earlySponsors.forEach(person => renderSponsorRow(list, person.name, person.date, true));
        }

        // 2. Новые спонсоры (из базы)
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            renderSponsorRow(list, data.name, data.date, false);
        });

    } catch (e) {
        console.error("Error loading sponsors:", e);
        list.innerHTML = '<div style="text-align:center; padding:20px; color:#e74c3c;">Error loading list. Check console.</div>';
    }
};

window.submitSponsorName = async function() {
    const input = document.getElementById('sponsor-nickname-input');
    const name = input.value.trim();
    const user = auth.currentUser;

    if (!name) return alert("Please enter a name");
    if (name.length > 30) return alert("Name is too long (max 30 chars)");
    if (!user) return alert("Error: User not found");

    const btn = document.querySelector('#sponsor-input-container button');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        const dateObj = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dateStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

        const batch = writeBatch(db);

        // 1. Создаем публичную запись
        const publicRef = doc(collection(db, "sponsors_public"));
        batch.set(publicRef, {
            name: name,
            date: dateStr,
            uid: user.uid,
            timestamp: serverTimestamp()
        });

        // 2. Обновляем профиль пользователя (чтобы скрыть поле)
        const userRef = doc(db, "users", user.uid);
        batch.update(userRef, {
            sponsorNameSet: true,
            sponsorNameValue: name
        });

        await batch.commit();

        // Обновляем локальный кеш
        if (window.cachedUserProfile) {
            window.cachedUserProfile.sponsorNameSet = true;
        }

        document.getElementById('sponsor-input-container').style.display = 'none';
        alert("Welcome to the Wall of Fame! ✨");
        window.openSponsorsModal(); // Перезагружаем список

    } catch (e) {
        console.error("Error saving sponsor:", e);
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.innerText = originalText;
    }
};

function renderSponsorRow(container, name, date, isVerified) {
    const row = document.createElement('div');
    row.className = 'ios-row';
    row.style.cursor = 'default';
    const icon = isVerified ? '💎' : '👑';
    
    const safeName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">${icon}</span>
            <span style="font-weight:600; color:var(--text-main);">${safeName}</span>
        </div>
        <span style="font-size:12px; color:var(--text-secondary); text-transform:uppercase;">${date}</span>
    `;
    container.appendChild(row);
}

// === ФУНКЦИИ ВХОДА/ВЫХОДА (Доступны глобально) ===

window.loginWithGoogle = async function() {
    try {
        await signInWithPopup(auth, provider);
        // Состояние обновится в onAuthStateChanged
    } catch (error) {
        console.error("Login failed:", error);
    }
};

window.logout = async function() {
    const user = auth.currentUser;
    
    // Попытка сохранить данные перед выходом
    if (user) {
        const btnText = document.getElementById('sync-btn-text');
        if(btnText) btnText.innerText = "Saving...";
        try {
            await window.syncToCloud(true);
        } catch (e) { console.error(e); }
    }

    try {
        await signOut(auth);
        
        // === ПОЛНАЯ ОЧИСТКА ДАННЫХ ПОДПИСКИ ===
        localStorage.removeItem('xch_last_sync_ts');
        localStorage.removeItem('xch_sub_level'); // УДАЛЯЕМ ПОДПИСКУ
        
        // Сбрасываем переменную в памяти
        subscriptionLevel = 'free';
        
        console.log("Logged out. Local subscription data cleared.");
        
        // Перезагрузка страницы применит Free тариф (т.к. в localStorage ничего нет)
        location.reload(); 
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

// === АКТИВАЦИЯ ПРОМОКОДА ===
window.activatePromoCode = async function(code) {
    const user = auth.currentUser;
    // Ссылки на документы
    const codeRef = doc(db, "promocodes", code);
    const userRef = doc(db, "users", user.uid);

    try {
        // 1. Сначала читаем код, чтобы убедиться, что он есть (как и раньше)
        const codeSnap = await getDoc(codeRef);
        if (!codeSnap.exists() || !codeSnap.data().active) {
            alert("Invalid code");
            return;
        }
        const promoData = codeSnap.data();

        // 2. Создаем ПАКЕТ (Batch)
        const batch = writeBatch(db);

        // Операция А: Сжигаем код
        batch.update(codeRef, {
            active: false,
            usedBy: user.uid,
            usedAt: serverTimestamp()
        });

        // Операция Б: Обновляем юзера
        batch.set(userRef, {
            subscription: promoData.type, // 'pro' или 'beast'
            expiresAt: new Date(Date.now() + (promoData.days * 86400000)),
            lastUsedCode: code 
        }, { merge: true });

        // 3. Отправляем всё вместе. Если хоть одно правило запретит, отменится ВСЁ.
        await batch.commit();

        alert("Success!");
        location.reload();

    } catch (error) {
        console.error("Hacking attempt failed:", error);
        alert("Error activating code.");
    }
};

// === 1. ФУНКЦИЯ КЛИКА ПО АККАУНТУ ===
window.handleLoginClick = function() {
    if (window.isUserLoggedIn) {
        openSyncInfoModal();
    } else {
        openLoginModal();
    }
};

// === 2. ОТКРЫТИЕ ОКНА И ПОДГРУЗКА СТАТИСТИКИ ===
window.openSyncInfoModal = async function() {
    const user = auth.currentUser;
    if (!user) return;

    document.body.classList.add('modal-open');
    document.getElementById('modal-sync-info-overlay').classList.add('open');
    
    const emailEl = document.getElementById('sync-email-display');
    if(emailEl) emailEl.innerText = user.email;

    // --- ЛОГИКА ПОДПИСКИ ---
    const subValue = document.getElementById('sync-sub-value');
    const subDesc = document.getElementById('sync-sub-desc');
    const subCard = document.getElementById('sync-sub-card');

    if(subDesc) subDesc.innerText = "Checking..."; 

    // Кэширование профиля
    const now = Date.now();
    let d = cachedUserProfile;
    if (!d || (now - lastProfileReadTime > 60000)) {
        try {
            const userRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                d = docSnap.data();
                cachedUserProfile = d;
                window.cachedUserProfile = d;
                lastProfileReadTime = now;
            }
        } catch (e) { console.error(e); }
    }

    const t = langData[currentLang] || langData['en'];

    // === 1. ОБНОВЛЕНИЕ ДАННЫХ ПОДПИСКИ (Если есть профиль) ===
    if (d) {
        const plan = d.subscription || 'free';
        if(subValue) subValue.innerText = plan.toUpperCase();
        
        if(subDesc) {
            if (plan === 'bestie') {
                subDesc.innerText = t.feat_lifetime.replace('<b>','').replace('</b>',''); 
            } else if (d.expiresAt && plan !== 'free') {
                const expDate = (d.expiresAt && typeof d.expiresAt.toDate === 'function') 
                    ? d.expiresAt.toDate() 
                    : new Date(d.expiresAt || Date.now());
                subDesc.innerText = `${t.sub_exp || 'Expires:'} ${expDate.toLocaleDateString()}`;
            } else {
                subDesc.innerText = plan === 'free' ? "Standard Account" : "Active";
            }
        }

        if(subCard) {
            subCard.classList.remove('is-free', 'is-pro', 'is-beast', 'is-bestie');
            subCard.classList.add('is-' + plan);
        }
    }

    // === 2. ОБНОВЛЕНИЕ СТАТИСТИКИ ===
    
    // А. Счетчики Избранного и WL
    if(document.getElementById('cloud-fav-count')) {
        document.getElementById('cloud-fav-count').innerText = (window.favorites || []).length;
    }
    if(document.getElementById('cloud-wl-count')) {
        document.getElementById('cloud-wl-count').innerText = (window.watchLater || []).length;
    }
    
    // Б. ОТКРЫТЫЕ ФЕТИШИ 
    if ((!window.permanentExplored || window.permanentExplored.size === 0) && window.activityLog && window.activityLog.length > 0) {
        if (!window.permanentExplored) window.permanentExplored = new Set();
        window.activityLog.forEach(log => {
            if (log.id) window.permanentExplored.add(log.id);
        });
        // Сохраняем восстановленное, чтобы в следующий раз не пересчитывать
        localStorage.setItem('xch_permanent_explored', JSON.stringify([...window.permanentExplored]));
    }

    let exCount = window.permanentExplored ? window.permanentExplored.size : 0;
    
    if(document.getElementById('cloud-explored-count')) {
        document.getElementById('cloud-explored-count').innerText = exCount;
    }
    
    // В. МИНУТЫ ПРОСМОТРА 
    const timeValEl = document.getElementById('cloud-ban-count');
    if(timeValEl) {
        const wHistory = window.watchHistory || [];
        
        // Считаем сумму секунд
        const totalSeconds = wHistory.reduce((acc, item) => {
            // Защита от кривых данных: parseInt гарантирует число
            return acc + (parseInt(item.seconds) || 0);
        }, 0);
        
        const totalMinutes = Math.floor(totalSeconds / 60);
        
        timeValEl.innerText = totalMinutes + "m";
        
        // Локализация подписи "Minutes"
        const parentBox = timeValEl.closest('.bento-box');
        if(parentBox) {
            const label = parentBox.querySelector('.bento-label');
            if(label) label.innerText = t.sync_minutes || "Minutes";
        }
    }
    
    applyLanguage();
};

window.closeSyncInfoModal = function(e, force) {
    if (force || e.target.id === 'modal-sync-info-overlay') {
        document.getElementById('modal-sync-info-overlay').classList.remove('open');
        document.body.classList.remove('modal-open');
    }
};

// === 3. РУЧНАЯ СИНХРОНИЗАЦИЯ (MERGE) ===
window.performManualSync = async function() {
    const user = auth.currentUser;
    if (!user) return;

    const btn = document.getElementById('btn-manual-sync');
    const btnText = document.getElementById('sync-btn-text');
    const originalText = btnText.innerText;
    
    // Получаем перевод для успеха
    const t = langData[currentLang] || langData['en'];
    const successText = t.sync_btn_success || "✅ Done! Reloading...";

    // Блокируем кнопку и включаем спиннер
    btn.disabled = true;
    btnText.innerHTML = `<span class="spinning-icon">↻</span> Syncing...`;
    
    try {
        await loadUserData(user); 

        // УСПЕХ
        btnText.innerHTML = successText;
        btn.style.background = "var(--highlight-green)"; // Зеленый цвет
        btn.style.color = "#fff";

        // АВТОМАТИЧЕСКАЯ ПЕРЕЗАГРУЗКА ЧЕРЕЗ 1.5 СЕК
        setTimeout(() => {
            location.reload();
        }, 1500);

    } catch (e) {
        console.error("Manual sync failed:", e);
        btnText.innerText = "❌ Error";
        setTimeout(() => {
            btnText.innerText = originalText;
            btn.disabled = false;
        }, 2000);
    }
};

// === СЛУШАТЕЛЬ АВТОРИЗАЦИИ (Главная точка входа) ===
onAuthStateChanged(auth, async (user) => {
    const btnText = document.getElementById('login-btn-text');
    
    // Получаем текущие переводы
    const currentLang = localStorage.getItem('xch_lang') || 'en';
    const t = (typeof langData !== 'undefined' && langData[currentLang]) ? langData[currentLang] : langData['en'];

    if (user) {
        // === ПОЛЬЗОВАТЕЛЬ ВОШЕЛ ===
        window.isUserLoggedIn = true;
        console.log("Authorized:", user.email);
        
        // 1. Обновляем текст кнопки
        if(btnText) {
            const activeText = t.personal_account || "Personal Account";
            const shortEmail = user.email.split('@')[0];
            // Просто текст и email серым цветом
            btnText.innerHTML = `${activeText} <span style="font-size:13px; color:var(--text-secondary); font-weight:400; margin-left:6px;">${shortEmail}</span>`;
        }

        // 2. Обновляем дату синхронизации и грузим данные
        if (window.updateLastSyncUI) window.updateLastSyncUI();
        await loadUserData(user); 

        // 3. Проверка промокода в URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            await window.activatePromoCode(code);
        }
    } else {
        // === ПОЛЬЗОВАТЕЛЬ ВЫШЕЛ ===
        window.isUserLoggedIn = false;
        
        // Возвращаем исходный текст
        const btnText = document.getElementById('login-btn-text');
        if(btnText) btnText.innerText = t.login_text || "Sync / Login";
        
        if (window.updateLastSyncUI) window.updateLastSyncUI();
    }

    // Кнопка админа
    if (user && user.uid === ADMIN_UID) {
        const btn = document.getElementById('btn-admin-trigger');
        if(btn) btn.style.display = 'flex';
    }
});

// 2. Выдача подписки по Email
window.adminGiftSub = async function() {
    const user = auth.currentUser;
    if (!user || user.uid !== ADMIN_UID) return;

    const emailInput = document.getElementById('admin-gift-email');
    let targetEmail = emailInput.value.trim();
    const type = document.getElementById('admin-gift-type').value;
    const days = parseInt(document.getElementById('admin-gift-days').value);

    if (!targetEmail) { alert("Введи email или ник!"); return; }

    // --- ЛОГИКА ДОБАВЛЕНИЯ @GMAIL.COM ---
    // Если в строке нет собаки (@), считаем это ником и добавляем домен
    if (!targetEmail.includes('@')) {
        targetEmail += '@gmail.com';
        // Обновляем поле, чтобы админ видел, что произошло
        emailInput.value = targetEmail; 
    }

    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Поиск...";
    btn.disabled = true;

    try {
        // Ищем пользователя в базе по полю email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", targetEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert(`Пользователь ${targetEmail} не найден в базе.\nПусть сначала нажмет 'Синхронизация'.`);
            return;
        }

        // Берем первого найденного 
        let targetUserDoc = null;
        querySnapshot.forEach((doc) => { targetUserDoc = doc; });

        // Вычисляем дату (если Bestie, дата не так важна, но пусть будет)
        const now = new Date();
        const expireDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

        // Обновляем документ ЧУЖОГО пользователя
        await updateDoc(targetUserDoc.ref, {
            subscription: type,
            expiresAt: Timestamp.fromDate(expireDate)
        });

        alert(`Успех! ${targetEmail} теперь ${type.toUpperCase()} на ${days} дн.`);
        emailInput.value = "";

    } catch (e) {
        console.error(e);
        alert("Ошибка: " + e.message);
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
};

// 3. Сброс подписки до FREE по Email
window.adminSetDiscount = async function() {
    const target = document.getElementById('admin-disc-target').value;
    const type = document.getElementById('admin-disc-type').value;
    const value = document.getElementById('admin-disc-value').value;
    const days = document.getElementById('admin-disc-days').value;

    if(!value) return alert("Введи сумму/процент!");

    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "...";

    try {
        const user = window.auth.currentUser;
        if (!user) return alert("Сначала войдите");

        const res = await fetch(`${API_BASE_URL}/admin/set-discount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: user.uid,
                planTarget: target,
                type: type,
                value: value,
                days: days
            })
        });
        
        if(res.ok) {
            alert("Скидка запущена! Перезагрузи страницу, чтобы увидеть.");
            location.reload();
        } else {
            alert("Ошибка сервера");
            btn.disabled = false;
            btn.innerText = "Запустить";
        }
    } catch(e) { 
        console.error(e);
        alert("Ошибка сети");
        btn.disabled = false;
        btn.innerText = "Запустить";
    }
}

window.adminRemoveDiscount = async function() {
    const user = window.auth.currentUser;
    if (!user) return;
    
    if(!confirm("Точно отключить текущую скидку?")) return;

    const btn = event.target;
    btn.disabled = true;
    btn.innerText = "...";

    try {
        await fetch(`${API_BASE_URL}/admin/remove-discount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid })
        });
        alert("Скидка отключена.");
        location.reload();
    } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.innerText = "Отключить";
    }
}

// Флаг: есть ли несохраненные изменения?
window.unsavedChanges = false;
let saveInterval = null;

// Функция, которую вызываем при ЛЮБОМ изменении (свайп, лайк, настройка)
window.markDirty = function() {
    window.unsavedChanges = true;
    // Можно добавить визуальную индикацию, если хочешь (например, точка в углу)
};

// 1. Слушатель ухода с вкладки (Сворачивание / Закрытие)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') {
        if (window.isUserLoggedIn && window.unsavedChanges) {
            console.log("App hidden, forcing save...");
            window.syncToCloud(true);
        }
    }
});



// 2. Таймер: сохраняем раз в 3 минуты (180 секунд), если есть изменения
if (saveInterval) clearInterval(saveInterval);
saveInterval = setInterval(() => {
    if (window.isUserLoggedIn && window.unsavedChanges) {
        console.log("Auto-saving by timer...");
        window.syncToCloud(true);
    }
}, 180 * 1000); // 180 секунд = 3 минуты

// === ЗАГРУЗКА И СЛИЯНИЕ ДАННЫХ (СЕРДЦЕ СИНХРОНИЗАЦИИ) ===
async function loadUserData(user) {
    const userRef = doc(db, "users", user.uid);
    
    try {
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            const now = new Date();
            
            // --- ПРОВЕРКА ИСТЕЧЕНИЯ ПОДПИСКИ ---
            let cloudSub = cloudData.subscription || 'free';
            
            // Если подписка не вечная (bestie) и не бесплатная, проверяем дату
            if (cloudSub !== 'free' && cloudSub !== 'bestie' && cloudData.expiresAt) {
                // Конвертируем Timestamp Firebase в объект Date
                const expDate = cloudData.expiresAt.toDate ? cloudData.expiresAt.toDate() : new Date(cloudData.expiresAt);
                
                if (now > expDate) {
                    console.log("🚨 Subscription expired! Resetting user to FREE.");
                    cloudSub = 'free';
                    
                    // Обновляем статус в облаке немедленно
                    await updateDoc(userRef, {
                        subscription: 'free'
                    });
                }
            }

            // Глобальные переменные (обновляем с учетом проверки)
            cachedUserProfile = { ...cloudData, subscription: cloudSub };
            window.cachedUserProfile = cachedUserProfile;
            lastProfileReadTime = Date.now();
            
            // 1. ПРИМЕНЯЕМ ПОДПИСКУ
            localStorage.setItem('xch_sub_level', cloudSub);
            if (typeof subscriptionLevel !== 'undefined') subscriptionLevel = cloudSub;
            if (window.updateSubscriptionUI) window.updateSubscriptionUI();

            // 2. СПИСКИ (Избранное, ЧС, WL)
            const mergeArrays = (local, cloud) => [...new Set([...local, ...cloud])];
            
            let mergedFav = mergeArrays(JSON.parse(localStorage.getItem('xch_favorites')) || [], cloudData.favorites || []);
            let mergedBan = mergeArrays(JSON.parse(localStorage.getItem('xch_blacklist')) || [], cloudData.blacklist || []);
            const mergedWL = mergeArrays(JSON.parse(localStorage.getItem('xch_watch_later')) || [], cloudData.watchLater || []);

            // Если после объединения фетиш оказался и в Лайках и в Блэклисте - выкидываем из Блэклиста
            mergedBan = mergedBan.filter(id => !mergedFav.includes(id));

            localStorage.setItem('xch_favorites', JSON.stringify(mergedFav));
            window.favorites = mergedFav;
            localStorage.setItem('xch_blacklist', JSON.stringify(mergedBan));
            window.blacklist = mergedBan;
            localStorage.setItem('xch_watch_later', JSON.stringify(mergedWL));
            window.watchLater = mergedWL;

            // 3. ИСТОРИЯ СВАЙПОВ
            const localHist = JSON.parse(localStorage.getItem('xch_history')) || [];
            const cloudHist = cloudData.history || [];
            const histMap = new Map();
            [...localHist, ...cloudHist].forEach(item => histMap.set(item.id, item));
            const mergedHistory = Array.from(histMap.values())
                .filter(item => item && (item.timestamp || item.ts))
                .sort((a, b) => (b.timestamp?.seconds || b.timestamp) - (a.timestamp?.seconds || a.timestamp))
                .slice(0, 100);
            
            localStorage.setItem('xch_history', JSON.stringify(mergedHistory));
            window.historyData = mergedHistory;

            // 4. ИСТОРИЯ ПРОСМОТРОВ
            const localWatch = JSON.parse(localStorage.getItem('xch_watch_history')) || [];
            const cloudWatch = cloudData.watchHistory || [];
            const watchMap = new Map();
            [...localWatch, ...cloudWatch].forEach(item => {
                if (item && item.id) {
                    const ts = item.timestamp?.seconds || item.timestamp || 0;
                    watchMap.set(`${item.id}_${ts}`, item);
                }
            });
            const mergedWatch = Array.from(watchMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 200);
            
            localStorage.setItem('xch_watch_history', JSON.stringify(mergedWatch));
            window.watchHistory = mergedWatch;

            // 5. ЛОГИ АКТИВНОСТИ
            const localLog = JSON.parse(localStorage.getItem('xch_activity_log')) || [];
            const cloudLog = cloudData.activityLog || [];
            const logMap = new Map();
            [...localLog, ...cloudLog].forEach(item => logMap.set((item.ts || 0) + "_" + item.id, item));
            
            const mergedLog = Array.from(logMap.values())
                .filter(item => item && item.ts)
                .sort((a, b) => (a.ts || 0) - (b.ts || 0)) // Сортируем по времени
                .slice(-5000);
            
            localStorage.setItem('xch_activity_log', JSON.stringify(mergedLog));
            window.activityLog = mergedLog;

            if (window.activityLog && window.activityLog.length > 0) {
                window.activityLog.forEach(log => {
                    if (log.id) window.permanentExplored.add(log.id);
                });
                localStorage.setItem('xch_permanent_explored', JSON.stringify([...window.permanentExplored]));
            }

            // 6. КАСТОМНЫЕ САЙТЫ 
            const localSites = JSON.parse(localStorage.getItem('xch_custom_sites')) || [];
            const cloudSites = cloudData.customSites || [];
            
            // Объединяем по ID, чтобы избежать дубликатов
            const siteMap = new Map();
            [...localSites, ...cloudSites].forEach(s => siteMap.set(s.id, s));
            const mergedSites = Array.from(siteMap.values());

            localStorage.setItem('xch_custom_sites', JSON.stringify(mergedSites));
            window.customSites = mergedSites;

            // ФИНАЛ
            localStorage.setItem('xch_last_sync_ts', Date.now());
            if (window.updateLastSyncUI) window.updateLastSyncUI();
            if (typeof updateCounts === 'function') updateCounts();
            if (typeof renderHistory === 'function') renderHistory();
            if (typeof updateActionButtons === 'function') updateActionButtons();

            // Проверка алертов об окончании (за 3 дня)
            checkSubscriptionExpiry(); 

            if (document.getElementById('modal-sync-info-overlay').classList.contains('open')) {
                window.openSyncInfoModal();
            }

        } else {
            localStorage.setItem('xch_sub_level', 'free');
            if (window.updateSubscriptionUI) window.updateSubscriptionUI();
            window.syncToCloud(true);
        }
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// === АВТО-СОХРАНЕНИЕ В ОБЛАКО ===
window.syncToCloud = async function(immediate = false) {
    const user = auth.currentUser;
    if (!user) return; 
    if (!immediate && !window.unsavedChanges) return;

    const userRef = doc(db, "users", user.uid);
    const currentPlatform = localStorage.getItem('xch_platform') || 'xh';
    const safeJSON = (key, def) => JSON.parse(localStorage.getItem(key)) || def;

    // Берем актуальные данные из памяти (window) или из localStorage
    const wHistory = window.watchHistory || safeJSON('xch_watch_history', []);

    const dataToSave = {
        favorites: window.favorites || safeJSON('xch_favorites', []),
        blacklist: window.blacklist || safeJSON('xch_blacklist', []),
        watchLater: window.watchLater || safeJSON('xch_watch_later', []),
        tagScores: window.tagScores || safeJSON('xch_tag_scores', {}),
        
        history: (window.historyData || safeJSON('xch_history', [])).slice(0, 100),
        activityLog: (window.activityLog || safeJSON('xch_activity_log', [])).slice(-300),
        watchHistory: wHistory.slice(0, 200),

        customSites: window.customSites || safeJSON('xch_custom_sites', []),
        
        platform: currentPlatform,
        email: user.email,
        lastUpdated: serverTimestamp(),
        modifiersPool: window.userModifiersPool || safeJSON('xch_user_mods', []),
        exploredCount: (window.permanentExplored ? window.permanentExplored.size : 0)
    };

    try {
        await setDoc(userRef, dataToSave, { merge: true });
        
        const now = Date.now();
        localStorage.setItem('xch_last_sync_ts', now);
        window.unsavedChanges = false;
        
        const btnText = document.getElementById('sync-btn-text');
        if(btnText) {
            btnText.innerHTML = "✅ Saved";
            setTimeout(() => { if(btnText) btnText.innerHTML = "🔄 Synchronize Device"; }, 2000);
        }
        console.log(`☁️ Cloud Save Success`);
    } catch (e) {
        console.error("Auto-save error:", e);
    }
};

window.refreshAdminStats = async function() {
    const user = auth.currentUser;
    if (!user || user.uid !== ADMIN_UID) return;

    let btn = null;
    let originalText = "";
    
    // Используем глобальный event
    if (typeof event !== 'undefined' && event && event.target) {
        // Ищем ближайшую кнопку или div
        const target = event.target.closest('button');
        if (target) {
            btn = target;
            originalText = btn.innerText;
            btn.innerText = "Loading...";
            btn.disabled = true;
        }
    }

    try {
        const usersRef = collection(db, "users");

        // 1. Общее кол-во пользователей
        const totalSnapshot = await getCountFromServer(usersRef);
        document.getElementById('stat-total-users').innerText = totalSnapshot.data().count;

        // 2. Кол-во платных (где подписка не free)
        const premiumQuery = query(usersRef, where("subscription", "!=", "free"));
        const premiumSnapshot = await getCountFromServer(premiumQuery);
        document.getElementById('stat-premium-users').innerText = premiumSnapshot.data().count;

    } catch (e) {
        console.error("Ошибка админ-статистики:", e);
    } finally {
        // Возвращаем текст кнопки обратно
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
};

// Авто-запуск при открытии админки
const originalOpenAdminModal = window.openAdminModal;
window.openAdminModal = function() {
    originalOpenAdminModal();
    refreshAdminStats();
};