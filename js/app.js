const initialParams = new URLSearchParams(window.location.search);
const state = window.state = {
    items: [],
    bookings: [],
    user: null,
    route: {
        from: initialParams.get('from') || '',
        to: initialParams.get('to') || '',
        date: initialParams.get('date') || '',
        passengers: Number(initialParams.get('seats')) || 1
    },
    searchQuery: '',
    selectedCategory: 'all',
    maxPrice: null,
    minRating: 0,
    sortBy: 'date-asc'
};

const DRAFT_KEY = 'poputka-route-draft';
const API_BASE_URL = String(window.POPUTKA_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}


function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function normalize(value) {
    return String(value ?? '').trim().toLowerCase();
}

function localDate(days = 0) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function showMessage(element, message, success = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('message-success', success);
}

async function api(path, options = {}) {
    let response;
    try {
        response = await fetch(apiUrl(path), {
            credentials: 'include',
            ...options,
            headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
        });
    } catch {
        throw new Error('Не удалось связаться с сервером. Проверьте, запущен ли backend.');
    }
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const detail = data.detail;
        const message = Array.isArray(detail) ? detail.map(item => item.msg).join('; ') : detail;
        const error = new Error(message || `Ошибка сервера (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return response.status === 204 ? null : response.json();
}

function safeNext(value) {
    if (!value) return './account.html';
    const next = new URL(value, window.location.href);
    const allowed = ['index.html', 'search.html', 'account.html', 'trip.html', 'create-trip.html'];
    return next.origin === window.location.origin && allowed.includes(next.pathname.split('/').pop()) ? next.pathname + next.search : './account.html';
}

function goToAuth(next) {
    window.location.href = `./auth.html?next=${encodeURIComponent(next || 'account.html')}`;
}

async function refreshUser() {
    try {
        state.user = await api('/api/auth/me');
    } catch (error) {
        if (error.status !== 401) showMessage(document.querySelector('#page-error'), error.message);
        state.user = null;
    }
    document.querySelectorAll('[data-auth-link]').forEach(link => {
        link.textContent = 'Личный кабинет';
        link.href = state.user ? './account.html' : './auth.html?next=account.html';
    });
    document.querySelectorAll('[data-profile-link]').forEach(link => link.hidden = !state.user);
}

async function loadData() {
    if (window.location.hostname.endsWith('github.io') && !API_BASE_URL) {
        state.items = [
            ['Москва', 'Тула', '09:30', 650, 3, 'Александр', 4.9],
            ['Москва', 'Тверь', '12:15', 540, 2, 'Мария', 5.0],
            ['Казань', 'Уфа', '08:00', 1100, 3, 'Дамир', 4.8],
            ['Санкт-Петербург', 'Москва', '08:00', 1750, 1, 'Елена', 5.0]
        ].map(([from_city, to_city, departure_time, price, seats, driver_name, driver_rating], index) => ({
            id: index + 1,
            from_city,
            to_city,
            departure_date: localDate(index + 2),
            departure_time,
            price,
            seats_available: seats,
            seats_total: seats,
            driver_name,
            driver_rating,
            driver_id: index + 1001,
            driver_avatar_url: null
        }));
        state.bookings = [];
        renderRides();
        return;
    }
    state.items = await api('/api/trips');
    state.bookings = state.user ? await api('/api/bookings/mine') : [];
    renderRides();
}

function bookedByMe(rideId) {
    return state.bookings.find(booking => booking.trip.id === rideId);
}

function buildRideCard(ride, showBookingAction = false) {
    const card = createElement('article', 'ride-card glass-element');
    const top = createElement('div', 'ride-card-top');
    const header = createElement('div', 'ride-header');
    const price = createElement('span', 'ride-price', `${ride.price} ₽ / место`);
    const seats = createElement('span', 'ride-seats', `${ride.seats_available} свободно`);
    header.append(price, seats);
    const timeBlock = createElement('div', 'ride-time-block');
    timeBlock.append(createElement('span', 'ride-time', String(ride.departure_time).slice(0, 5)), createElement('span', 'ride-date', formatDate(ride.departure_date)));
    const city = createElement('span', 'ride-city', `${ride.from_city} → ${ride.to_city}`);
    top.append(header, timeBlock, city);
    const driverInfo = createElement('div', 'driver-info');
    const avatar = createElement('div', 'driver-avatar');
    if (ride.driver_avatar_url) {
        const image = createElement('img', 'driver-avatar-image');
        image.src = apiUrl(ride.driver_avatar_url);
        image.alt = `Фото водителя ${ride.driver_name}`;
        image.loading = 'lazy';
        avatar.append(image);
    }
    const driverText = createElement('div', 'driver-info-block');
    driverText.append(createElement('div', 'driver-name', ride.driver_name), createElement('div', 'driver-rating', ride.driver_rating ? `★ ${ride.driver_rating}` : 'Новый водитель'));
    driverInfo.append(avatar, driverText);
    const action = createElement('a', 'btn-secondary btn-rides');
    const detailUrl = `./trip.html?id=${ride.id}`;
    const bookingAvailable = ride.seats_available > 0 && ride.departure_date >= localDate();
    action.href = showBookingAction && !state.user ? `./auth.html?next=${encodeURIComponent(`trip.html?id=${ride.id}`)}` : detailUrl;
    action.textContent = showBookingAction ? 'Бронь' : ride.driver_id === state.user?.id ? 'Управлять' : bookedByMe(ride.id) ? 'Моя бронь' : bookingAvailable ? 'Подробнее / бронь' : 'Подробнее';
    if (showBookingAction) action.setAttribute('aria-label', `Бронь: ${ride.from_city} — ${ride.to_city}`);
    card.append(top, driverInfo, action);
    return card;
}

function getVisibleRides() {
    return state.items.filter(ride => {
        const matches = (!state.route.from || normalize(ride.from_city) === normalize(state.route.from)) &&
            (!state.route.to || normalize(ride.to_city) === normalize(state.route.to)) &&
            (!state.route.date || ride.departure_date === state.route.date) &&
            ride.seats_available >= state.route.passengers &&
            (!state.searchQuery || normalize(`${ride.driver_name} ${ride.from_city} ${ride.to_city}`).includes(normalize(state.searchQuery))) &&
            (state.maxPrice === null || ride.price <= state.maxPrice) &&
            (state.selectedCategory === 'all' || (state.selectedCategory === 'one' && ride.seats_available === 1) || (state.selectedCategory === 'two' && ride.seats_available === 2) || (state.selectedCategory === 'three-plus' && ride.seats_available >= 3)) &&
            ride.driver_rating >= state.minRating;
        return matches;
    }).sort((a, b) => {
        if (state.sortBy === 'price-asc') return a.price - b.price;
        if (state.sortBy === 'price-desc') return b.price - a.price;
        const left = `${a.departure_date} ${a.departure_time}`;
        const right = `${b.departure_date} ${b.departure_time}`;
        return state.sortBy === 'date-desc' ? right.localeCompare(left) : left.localeCompare(right);
    });
}

function renderCityOptions(items, property, dropdown) {
    if (!dropdown) return;
    const values = [...new Set(items.map(item => item[property]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
    dropdown.replaceChildren(...values.map(value => {
        const option = createElement('li', '', value);
        option.dataset.value = value;
        option.setAttribute('role', 'option');
        return option;
    }));
}

function initCustomDropdown(input, dropdown) {
    if (!input || !dropdown) return;
    function filter() {
        const search = normalize(input.value);
        dropdown.querySelectorAll('li').forEach(option => option.hidden = !normalize(option.dataset.value).includes(search));
        dropdown.classList.add('show');
    }
    input.addEventListener('focus', filter);
    input.addEventListener('input', filter);
    dropdown.addEventListener('click', event => {
        const option = event.target.closest('li[data-value]');
        if (!option || option.hidden) return;
        input.value = option.dataset.value;
        dropdown.classList.remove('show');
    });
    document.addEventListener('click', event => {
        if (!input.contains(event.target) && !dropdown.contains(event.target)) dropdown.classList.remove('show');
    });
}

function renderRides() {
    renderCityOptions(state.items, 'from_city', document.querySelector('#from-dropdown'));
    renderCityOptions(state.items, 'to_city', document.querySelector('#to-dropdown'));
    const popular = document.querySelector('#popular-rides');
    if (popular) popular.replaceChildren(...state.items.filter(ride => ride.seats_available > 0 && ride.departure_date >= localDate()).slice(0, 4).map(ride => buildRideCard(ride, true)));
    const routes = document.querySelector('#routes');
    if (routes) {
        const rides = getVisibleRides();
        routes.replaceChildren(...rides.map(buildRideCard));
        if (!rides.length) routes.append(createElement('p', 'empty-state glass-element', 'Поездки не найдены. Измените параметры поиска.'));
        const results = document.querySelector('#results-count');
        if (results) results.textContent = `Найдено поездок: ${rides.length}`;
    }
}

function updateSearchUrl() {
    const params = new URLSearchParams();
    if (state.route.from) params.set('from', state.route.from);
    if (state.route.to) params.set('to', state.route.to);
    if (state.route.date) params.set('date', state.route.date);
    params.set('seats', String(state.route.passengers));
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
}

function initSearch() {
    const form = document.querySelector('#search-form');
    if (!form) return;
    const from = form.querySelector('#from');
    const to = form.querySelector('#to');
    const date = form.querySelector('#date');
    const passengers = form.querySelector('#passengers');
    from.value = state.route.from;
    to.value = state.route.to;
    date.value = state.route.date;
    passengers.value = String(state.route.passengers);
    initCustomDropdown(from, document.querySelector('#from-dropdown'));
    initCustomDropdown(to, document.querySelector('#to-dropdown'));
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const params = new URLSearchParams({ from: from.value.trim(), to: to.value.trim(), date: date.value, seats: passengers.value });
        if (!document.querySelector('#routes')) {
            window.location.href = `./search.html?${params}`;
            return;
        }
        Object.assign(state.route, { from: from.value.trim(), to: to.value.trim(), date: date.value, passengers: Number(passengers.value) });
        updateSearchUrl();
        renderRides();
    });
    if (!document.querySelector('#routes')) return;
    const controls = {
        searchQuery: document.querySelector('#search-query'),
        selectedCategory: document.querySelector('#category-filter'),
        maxPrice: document.querySelector('#max-price'),
        minRating: document.querySelector('#min-rating'),
        sortBy: document.querySelector('#sort-by')
    };
    Object.entries(controls).forEach(([key, input]) => {
        if (!input) return;
        input.addEventListener(key === 'searchQuery' || key === 'maxPrice' ? 'input' : 'change', () => {
            state[key] = key === 'maxPrice' ? (input.value ? Number(input.value) : null) : key === 'minRating' ? Number(input.value) : input.value;
            renderRides();
        });
    });
    document.querySelector('#reset-filters')?.addEventListener('click', () => {
        Object.assign(state, { searchQuery: '', selectedCategory: 'all', maxPrice: null, minRating: 0, sortBy: 'date-asc' });
        controls.searchQuery.value = '';
        controls.selectedCategory.value = 'all';
        controls.maxPrice.value = '';
        controls.minRating.value = '0';
        controls.sortBy.value = 'date-asc';
        renderRides();
    });
}

function readTripForm(form) {
    const value = name => form.elements.namedItem(name)?.value.trim() || '';
    return {
        from_city: value('from_city'),
        to_city: value('to_city'),
        departure_date: value('departure_date'),
        departure_time: value('departure_time'),
        price: Number(value('price')),
        seats_total: Number(value('seats_total')),
        description: value('description')
    };
}

function validateForm(form) {
    let valid = true;
    form.querySelectorAll('input, textarea').forEach(input => {
        const error = form.querySelector(`[data-error-for="${input.id}"]`);
        const message = input.validity.valid ? '' : input.validity.valueMissing ? 'Заполните это поле.' : input.validity.tooShort ? 'Слишком короткое значение.' : input.validity.rangeUnderflow ? 'Значение меньше допустимого.' : input.validity.rangeOverflow ? 'Значение больше допустимого.' : 'Проверьте введённые данные.';
        if (error) error.textContent = message;
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (message) valid = false;
    });
    const from = form.elements.namedItem('from_city');
    const to = form.elements.namedItem('to_city');
    if (from && to && normalize(from.value) === normalize(to.value)) {
        const error = form.querySelector(`[data-error-for="${to.id}"]`);
        if (error) error.textContent = 'Выберите другой город прибытия.';
        valid = false;
    }
    return valid;
}

function saveDraftAndContinue(form, errorElement) {
    if (!validateForm(form)) {
        showMessage(errorElement, 'Исправьте ошибки в форме.');
        return;
    }
    const data = readTripForm(form);
    if (`${data.departure_date}T${data.departure_time}` <= `${localDate()}T${new Date().toTimeString().slice(0, 5)}`) {
        showMessage(errorElement, 'Дата и время отправления должны быть в будущем.');
        return;
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    if (state.user) window.location.href = './create-trip.html';
    else goToAuth('create-trip.html');
}

function initOfferForm() {
    const form = document.querySelector('#offer-form');
    if (!form) return;
    form.elements.namedItem('departure_date').min = localDate();
    form.addEventListener('submit', event => {
        event.preventDefault();
        saveDraftAndContinue(form, document.querySelector('#offer-form-error'));
    });
}

function initRideModal() {
    const modal = document.querySelector('#ride-modal');
    const button = document.querySelector('#open-ride-modal');
    if (!button || !modal) return;
    const form = document.querySelector('#ride-form');
    const close = () => {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
    };
    button.addEventListener('click', () => {
        modal.hidden = false;
        document.body.classList.add('modal-open');
        form.elements.namedItem('departure_date').min = localDate();
        form.querySelector('input')?.focus();
    });
    modal.addEventListener('click', event => {
        if (event.target === modal || event.target.closest('[data-close-modal]')) close();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) close();
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        saveDraftAndContinue(form, document.querySelector('#ride-form-error'));
    });
}

function initAuth() {
    const login = document.querySelector('#login-form');
    const register = document.querySelector('#register-form');
    if (!login || !register) return;
    const show = type => {
        login.hidden = type !== 'login';
        register.hidden = type !== 'register';
        document.querySelectorAll('[data-auth-tab]').forEach(button => button.classList.toggle('tab-active', button.dataset.authTab === type));
        showMessage(document.querySelector('#auth-error'), '');
    };
    document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => show(button.dataset.authTab)));
    document.querySelectorAll('[data-switch-auth]').forEach(button => button.addEventListener('click', () => show(button.dataset.switchAuth)));
    show(initialParams.get('mode') === 'register' ? 'register' : 'login');
    for (const [form, action] of [[login, 'login'], [register, 'register']]) {
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            showMessage(document.querySelector('#auth-error'), '');
            const data = Object.fromEntries(new FormData(form));
            try {
                await api(`/api/auth/${action}`, { method: 'POST', body: JSON.stringify(data) });
                window.location.href = safeNext(initialParams.get('next'));
            } catch (error) {
                showMessage(document.querySelector('#auth-error'), error.message);
            } finally {
                submit.disabled = false;
            }
        });
    }
    if (state.user) window.location.replace(safeNext(initialParams.get('next')));
}

async function initCreateTrip() {
    const form = document.querySelector('#create-trip-form');
    if (!form) return;
    if (!state.user) return goToAuth(`create-trip.html${window.location.search}`);
    const editId = Number(initialParams.get('edit'));
    const error = document.querySelector('#create-trip-error');
    form.elements.namedItem('departure_date').min = localDate();
    let values = {};
    if (editId) {
        try {
            const trip = await api(`/api/trips/${editId}`);
            if (trip.driver_id !== state.user.id) throw new Error('Изменение чужой поездки запрещено.');
            values = trip;
            document.querySelector('#create-trip-title').textContent = 'Редактирование поездки';
            form.querySelector('[type="submit"]').textContent = 'Сохранить изменения';
        } catch (e) {
            showMessage(error, e.message);
            form.querySelector('[type="submit"]').disabled = true;
            return;
        }
    } else {
        try { values = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); } catch { values = {}; }
    }
    for (const [key, value] of Object.entries(values)) {
        const field = form.elements.namedItem(key);
        if (field && value !== null) field.value = key === 'departure_time' ? String(value).slice(0, 5) : value;
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!validateForm(form)) return showMessage(error, 'Исправьте ошибки в полях формы.');
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        try {
            const trip = await api(editId ? `/api/trips/${editId}` : '/api/trips', { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(readTripForm(form)) });
            sessionStorage.removeItem(DRAFT_KEY);
            window.location.href = `./trip.html?id=${trip.id}`;
        } catch (e) {
            showMessage(error, e.message);
            button.disabled = false;
        }
    });
}

function infoLine(label, value) {
    const wrapper = createElement('div', 'detail-line');
    wrapper.append(createElement('span', 'detail-label', label), createElement('strong', '', String(value)));
    return wrapper;
}

function addSimpleButton(parent, label, className, action, id) {
    const button = createElement('button', className, label);
    button.type = 'button';
    button.dataset[action] = String(id);
    parent.append(button);
    return button;
}

async function initTripDetail() {
    const wrapper = document.querySelector('#trip-detail');
    if (!wrapper) return;
    const id = Number(initialParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) return showMessage(wrapper, 'Неверный адрес поездки.');
    try {
        const trip = await api(`/api/trips/${id}`);
        const myBooking = bookedByMe(id);
        const title = createElement('h1', 'section-title detail-title', `${trip.from_city} → ${trip.to_city}`);
        const summary = createElement('p', 'section-subtitle', `${formatDate(trip.departure_date)}, ${String(trip.departure_time).slice(0, 5)}`);
        const panel = createElement('div', 'detail-panel glass-element');
        const fields = createElement('div', 'detail-lines');
        fields.append(infoLine('Водитель', trip.driver_name), infoLine('Стоимость одного места', `${trip.price} ₽`), infoLine('Свободных мест', `${trip.seats_available} из ${trip.seats_total}`), infoLine('Описание', trip.description || 'Дополнительных пожеланий нет'));
        panel.append(fields);
        const heading = createElement('h2', 'detail-subtitle', `Пассажиры (${trip.passengers.length})`);
        const passengers = createElement('div', 'passenger-list');
        if (trip.passengers.length) {
            trip.passengers.forEach(passenger => passengers.append(infoLine(passenger.name, `${passenger.seats} мест`)));
        } else passengers.append(createElement('p', 'muted', 'Пока никто не забронировал поездку.'));
        panel.append(heading, passengers);
        const actions = createElement('div', 'detail-actions');
        if (state.user?.id === trip.driver_id) {
            const edit = createElement('a', 'btn-primary action-link', 'Редактировать');
            edit.href = `./create-trip.html?edit=${trip.id}`;
            actions.append(edit);
            addSimpleButton(actions, 'Удалить поездку', 'btn-secondary danger-button', 'deleteTrip', trip.id);
        } else if (myBooking) {
            actions.append(createElement('p', 'success-message', `Вы забронировали ${myBooking.seats} мест.`));
            addSimpleButton(actions, 'Отменить бронирование', 'btn-secondary', 'cancelBooking', myBooking.id);
        } else if (trip.seats_available && trip.departure_date >= localDate()) {
            const label = createElement('label', 'booking-seats');
            label.htmlFor = 'booking-count';
            label.textContent = 'Мест для бронирования';
            const count = createElement('input', '', '');
            count.type = 'number';
            count.id = 'booking-count';
            count.value = '1';
            count.min = '1';
            count.max = String(Math.min(8, trip.seats_available));
            label.append(count);
            actions.append(label);
            addSimpleButton(actions, 'Забронировать', 'btn-primary', 'bookTrip', trip.id);
        } else {
            actions.append(createElement('p', 'muted', 'Бронирование недоступно: свободных мест нет или поездка уже началась.'));
        }
        panel.append(actions);
        wrapper.replaceChildren(title, summary, panel);
    } catch (error) {
        showMessage(wrapper, error.message);
    }
}

function displayAvatar(user) {
    const image = document.querySelector('#profile-avatar-image');
    const initial = document.querySelector('#avatar-letter');
    const remove = document.querySelector('#remove-avatar');
    if (!image || !initial || !remove) return;
    const hasAvatar = Boolean(user.avatar_url);
    image.hidden = !hasAvatar;
    initial.hidden = hasAvatar;
    initial.textContent = user.name?.trim()?.charAt(0).toUpperCase() || 'П';
    remove.hidden = !hasAvatar;
    if (hasAvatar) image.src = `${apiUrl(user.avatar_url)}?v=${Date.now()}`;
    else image.removeAttribute('src');
}

function initAvatarUpload() {
    const input = document.querySelector('#avatar-file');
    const remove = document.querySelector('#remove-avatar');
    const message = document.querySelector('#account-error');
    const change = document.querySelector('#change-avatar');
    if (!input || !remove || !change) return;
    change.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            input.value = '';
            showMessage(message, 'Фотография должна быть не больше 2 МБ.');
            return;
        }
        const formData = new FormData();
        formData.append('photo', file);
        input.disabled = true;
        showMessage(message, '');
        try {
            state.user = await api('/api/users/me/avatar', { method: 'POST', body: formData });
            displayAvatar(state.user);
            showMessage(message, 'Фотография профиля обновлена.', true);
        } catch (error) {
            showMessage(message, error.message);
        } finally {
            input.value = '';
            input.disabled = false;
        }
    });
    remove.addEventListener('click', async () => {
        remove.disabled = true;
        try {
            await api('/api/users/me/avatar', { method: 'DELETE' });
            state.user = await api('/api/auth/me');
            displayAvatar(state.user);
            showMessage(message, 'Фотография удалена.', true);
        } catch (error) {
            showMessage(message, error.message);
        } finally {
            remove.disabled = false;
        }
    });
}

async function initAccount() {
    const created = document.querySelector('#my-created');
    const booked = document.querySelector('#my-booked');
    if (!created || !booked) return;
    if (!state.user) return goToAuth('account.html');
    document.querySelector('#profile-name').textContent = state.user.name;
    document.querySelector('#profile-email').textContent = state.user.email;
    displayAvatar(state.user);
    initAvatarUpload();
    const mine = state.items.filter(trip => trip.driver_id === state.user.id);
    created.replaceChildren(...mine.map(buildRideCard));
    if (!mine.length) created.append(createElement('p', 'empty-state glass-element', 'Вы ещё не публиковали поездки.'));
    booked.replaceChildren(...state.bookings.map(booking => {
        const card = buildRideCard(booking.trip);
        card.append(createElement('p', 'booking-caption', `Забронировано мест: ${booking.seats}`));
        return card;
    }));
    if (!state.bookings.length) booked.append(createElement('p', 'empty-state glass-element', 'Пока нет бронирований. Найдите подходящий маршрут.'));
    document.querySelector('#logout-button')?.addEventListener('click', async () => {
        try {
            await api('/api/auth/logout', { method: 'POST' });
            window.location.href = './index.html';
        } catch (error) { showMessage(document.querySelector('#account-error'), error.message); }
    });
}

function initActions() {
    document.addEventListener('click', async event => {
        const bookButton = event.target.closest('[data-book-trip]');
        const deleteButton = event.target.closest('[data-delete-trip]');
        const cancelButton = event.target.closest('[data-cancel-booking]');
        if (!bookButton && !deleteButton && !cancelButton) return;
        const button = bookButton || deleteButton || cancelButton;
        if (!state.user) return goToAuth(`trip.html?id=${button.dataset.bookTrip || button.dataset.deleteTrip}`);
        if (deleteButton && !window.confirm('Удалить свою поездку? Это действие нельзя отменить.')) return;
        if (cancelButton && !window.confirm('Отменить бронирование?')) return;
        if (bookButton) {
            const count = document.querySelector('#booking-count');
            if (count && !count.reportValidity()) return;
        }
        button.disabled = true;
        try {
            if (bookButton) {
                const count = document.querySelector('#booking-count');
                await api('/api/bookings', { method: 'POST', body: JSON.stringify({ trip_id: Number(bookButton.dataset.bookTrip), seats: Number(count?.value || 1) }) });
            } else if (deleteButton) {
                await api(`/api/trips/${deleteButton.dataset.deleteTrip}`, { method: 'DELETE' });
                window.location.href = './account.html';
                return;
            } else {
                await api(`/api/bookings/${cancelButton.dataset.cancelBooking}`, { method: 'DELETE' });
            }
            await loadData();
            await initTripDetail();
        } catch (error) {
            showMessage(document.querySelector('#page-error'), error.message);
            button.disabled = false;
        }
    });
}

async function start() {
    initActions();
    initSearch();
    initOfferForm();
    initRideModal();
    if (window.location.hostname.endsWith('github.io') && !API_BASE_URL) {
        showMessage(document.querySelector('#page-error'), 'Для работы регистрации и бронирований подключите backend: настройте адрес API в js/config.js.');
    }
    try {
        if (!(window.location.hostname.endsWith('github.io') && !API_BASE_URL)) await refreshUser();
        await loadData();
        initAuth();
        await initCreateTrip();
        await initAccount();
        await initTripDetail();
    } catch (error) {
        showMessage(document.querySelector('#page-error'), error.message);
    }
}

start();
