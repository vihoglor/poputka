const defaultRides = [
    {
        id: 1,
        from: "Москва",
        to: "Тула",
        date: "2026-10-11",
        time: "09:30",
        price: 650,
        seats: 3,
        driver: "Александр",
        rating: 4.9,
        popularity: 111
    },
    {
        id: 2,
        from: "Москва",
        to: "Тверь",
        date: "2026-10-11",
        time: "12:15",
        price: 540,
        seats: 2,
        driver: "Мария",
        rating: 5,
        popularity: 145
    },
    {
        id: 3,
        from: "Казань",
        to: "Уфа",
        date: "2026-10-11",
        time: "08:00",
        price: 1100,
        seats: 3,
        driver: "Дамир",
        rating: 4.8,
        popularity: 210
    },
    {
        id: 4,
        from: "Санкт-Петербург",
        to: "Москва",
        date: "2026-10-11",
        time: "08:00",
        price: 1750,
        seats: 1,
        driver: "Елена",
        rating: 5,
        popularity: 321
    },
    {
        id: 5,
        from: "Уфа",
        to: "Златоуст",
        date: "2026-10-11",
        time: "08:00",
        price: 800,
        seats: 2,
        driver: "Елена",
        rating: 5,
        popularity: 260
    }
];

const STORAGE_KEY = "poputka-v1";

function saveRides(items){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadRides(){
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved){ return [...defaultRides];}
    return JSON.parse(saved);
}

function createElement(tag, className, text){
    const element = document.createElement(tag);
    if(className) element.className = className;
    if(text !== undefined) element.textContent = text;
    return element;
}

function normalize(value){
    return String(value).trim().toLowerCase();
}

function dateAfter(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}


// создание карточки маршрута
function buildRideCard(ride){
    const card = createElement("div", "ride-card glass-element");
    
    const top = createElement("div", "ride-card-top");
    const header = createElement("div", "ride-header");
    const price = createElement("span", "ride-price", `${ride.price} ₽ / место`);
    const seats = createElement("span", "ride-seats", `${ride.seats} места`);
    header.append(price,seats);

    const timeBlock = createElement("div", "ride-time-block");
    const time = createElement("span", "ride-time", `${ride.time}`);
    const formattedDate = new Date(ride.date).toLocaleDateString("ru-RU");
    const date = createElement("span", "ride-date", `${formattedDate}`);
    timeBlock.append(time, date);

    const city = createElement("span", "ride-city", `${ride.from} → ${ride.to}`);
    top.append(header, timeBlock, city)

    const driverInfo = createElement("div", "driver-info");
    const avatar = createElement("div", "driver-avatar");
    const driverText = createElement("div");
    const driverName = createElement("div", "driver-name", `${ride.driver}`);
    const driverRating = createElement("div", "driver-rating", `★ ${ride.rating}`);

    const btn = createElement("a", "btn-secondary btn-rides", "Забронировать");
    btn.addEventListener("click", () => {
        alert("забронирована");
    })

    driverText.append(driverName, driverRating);
    driverInfo.append(avatar, driverText);
    card.append(top, driverInfo, btn);
    return card;

}

// выгрузка карточек

function initHomePage() {
    const popularContainer = document.querySelector("#popular-rides");
    const searchForm = document.querySelector("#search-form");

    const modal = document.querySelector("#ride-modal");
    const openModalButton = document.querySelector("#open-ride-modal");
    const rideForm = document.querySelector("#ride-form");
    const rideFormError = document.querySelector("#ride-form-error");

    const rideFromInput = document.querySelector("#ride-from");
    const rideDateInput = document.querySelector("#ride-date");
    const rideSeatsInput = document.querySelector("#ride-seats");

    if (!popularContainer || !searchForm) return;

    let rides = loadRides();

    function renderPopularRides() {
        const popularRides = [...rides]
            .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
            .slice(0, 4);

        popularContainer.replaceChildren();

        popularRides.forEach((ride) => {
            popularContainer.append(buildRideCard(ride));
        });
    }

    renderPopularRides();

    // Поиск поездок
    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const from = document.querySelector("#from").value.trim();
        const to = document.querySelector("#to").value.trim();
        const date = document.querySelector("#date").value;
        const passengers =
            document.querySelector("#passengers").value || "1";

        const params = new URLSearchParams({
            from,
            to,
            date,
            seats: passengers
        });

        window.location.href = `./search.html?${params.toString()}`;
    });

    // Если модального окна нет, не подключаем его обработчики
    if (!modal || !openModalButton || !rideForm || !rideFormError) {
        return;
    }

    function showFieldError(input, message) {
        const errorElement = rideForm.querySelector(
            `[data-error-for="${input.id}"]`
        );

        input.setAttribute("aria-invalid", message ? "true" : "false");

        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function clearFormErrors() {
        rideForm.querySelectorAll("input").forEach((input) => {
            showFieldError(input, "");
        });

        rideFormError.textContent = "";
    }

    function openModal() {
        modal.hidden = false;
        document.body.classList.add("modal-open");

        if (rideDateInput) {
            rideDateInput.min = dateAfter(0);
        }

        clearFormErrors();
        rideFromInput?.focus();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove("modal-open");
        rideFormError.textContent = "";
    }

    // Открытие окна
    openModalButton.addEventListener("click", openModal);

    // Закрытие крестиком, кнопкой отмены или кликом по фону
    modal.addEventListener("click", (event) => {
        if (
            event.target === modal ||
            event.target.closest("[data-close-modal]")
        ) {
            closeModal();
        }
    });

    // Закрытие клавишей Escape
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    function getValidationMessage(input) {
        const label =
            input.closest(".form-field")?.querySelector("label")?.textContent
            || "Поле";

        if (input.validity.valueMissing) {
            return `${label}: заполните поле.`;
        }

        if (input.validity.tooShort) {
            return `${label}: слишком короткое значение.`;
        }

        if (input.validity.rangeUnderflow) {
            return `${label}: значение меньше допустимого.`;
        }

        if (input.validity.rangeOverflow) {
            return `${label}: значение больше допустимого.`;
        }

        if (input.validity.stepMismatch) {
            return `${label}: введите корректное число.`;
        }

        return "Проверьте значение поля.";
    }

    function validateRideForm() {
        let isValid = true;

        rideForm.querySelectorAll("input").forEach((input) => {
            if (!input.validity.valid) {
                showFieldError(input, getValidationMessage(input));
                isValid = false;
            } else {
                showFieldError(input, "");
            }
        });

        return isValid;
    }

    // Убираем ошибку при исправлении поля
    rideForm.addEventListener("input", (event) => {
        const input = event.target;

        if (input.matches("input") && input.validity.valid) {
            showFieldError(input, "");
            rideFormError.textContent = "";
        }
    });

    // Создание новой поездки
    rideForm.addEventListener("submit", (event) => {
        event.preventDefault();
        rideFormError.textContent = "";

        if (!validateRideForm()) {
            rideFormError.textContent =
                "Исправьте ошибки в форме и попробуйте ещё раз.";
            return;
        }

        const newRide = {
            id: Date.now(),
            from: document.querySelector("#ride-from").value.trim(),
            to: document.querySelector("#ride-to").value.trim(),
            date: document.querySelector("#ride-date").value,
            time: document.querySelector("#ride-time").value,
            price: Number(document.querySelector("#ride-price").value),
            seats: Number(document.querySelector("#ride-seats").value),
            driver: document.querySelector("#ride-driver").value.trim(),
            rating: 0,
            popularity: 0
        };

        rides = [...rides, newRide];

        saveRides(rides);
        renderPopularRides();

        rideForm.reset();

        if (rideSeatsInput) {
            rideSeatsInput.value = "3";
        }

        clearFormErrors();
        closeModal();
    });
}


 



// страница search.html

function initSearchPage(){
    const routesContainer = document.querySelector("#routes");
    if (!routesContainer) return;

    const searchForm = document.querySelector("#search-form");
    const fromInput = document.querySelector("#from");
    const toInput = document.querySelector("#to");
    const dateInput = document.querySelector("#date");
    const passengersInput = document.querySelector("#passengers");
    const searchQueryInput = document.querySelector("#search-query");
    const categoryFilter = document.querySelector("#category-filter");
    const maxPriceInput = document.querySelector("#max-price");
    const minRatingSelect = document.querySelector("#min-rating");
    const sortSelect = document.querySelector("#sort-by");
    const resetButton = document.querySelector("#reset-filters");
    const resultsCount = document.querySelector("#results-count");

    const modal = document.querySelector("#ride-modal");
    const openModalButton = document.querySelector("#open-ride-modal");
    const rideForm = document.querySelector("#ride-form");
    const rideFormError = document.querySelector("#ride-form-error");




    const params = new URLSearchParams(window.location.search);

    const state = {
        items: loadRides(),
        route: {
            from: params.get("from") || "",
            to: params.get("to") || "",
            date: params.get("date") || "",
            passangers: Number(params.get("seats")) || 1
        },
        searchQuery: "",
        selectedCategory: "all",
        maxPrice: null,
        minRating: 0,
        sortBy: "date-asc"
    };


    fromInput.value = state.route.from;
    toInput.value = state.route.to;
    dateInput.value = state.route.date;
    passengersInput.value = String(state.route.passangers);
    
    function getVisibleRides() {
        const filtered = state.items.filter((ride) => {
            const routeFromMatches = !state.route.from || normalize(ride.from) === normalize(state.route.from);
            const routeToMatches = !state.route.to || normalize(ride.to) === normalize(state.route.to);
            const dateMatches = !state.route.date || ride.date === state.route.date;
            const passengersMatch = ride.seats >= state.route.passangers;
            const text = normalize(`${ride.driver} ${ride.from} ${ride.to}`);
            const searchMatches = !state.searchQuery || text.includes(normalize(state.searchQuery));
            const priceMatches = state.maxPrice === null || ride.price <= state.maxPrice;
            const ratingMatches = ride.rating >= state.minRating;

            return routeFromMatches && routeToMatches && dateMatches && passengersMatch && searchMatches && priceMatches && ratingMatches;
        });

        return [...filtered].sort((a,b) =>{
            if(state.sortBy === "date-desc"){
                return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
            }

            if(state.sortBy === "price-asc"){
                return a.price - b.price;
            }

            if(state.sortBy === "price-desc"){
                return b.price - a.price;
            }
            return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

        });
    }
    
    function render(){
        const visibleRides = getVisibleRides();
        console.log(visibleRides);
        routesContainer.replaceChildren();

        if(visibleRides.length === 0){
            resultsCount.textContent = `Подходящих поездок нет`;
            return;
        }else{
            resultsCount.textContent = `Найдено поездок: ${visibleRides.length}`;
        }

        visibleRides.forEach((ride) => {
            routesContainer.append(buildRideCard(ride));
        })
        console.log(routesContainer);

    }

    function updateUrl(){
        const nextParams = new URLSearchParams();

        if(state.route.from) nextParams.set("from", state.route.from);
        if(state.route.to) nextParams.set("to", state.route.to);
        if(state.route.date) nextParams.set("date", state.route.date);
        nextParams.set("seats", String(state.route.passangers));

        const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
        history.replaceState(null, "", nextUrl);

    }

    searchForm.addEventListener("submit", (event) =>{
        event.preventDefault();

        state.route.from = fromInput.value.trim();
        state.route.to = toInput.value.trim();
        state.route.date = dateInput.value;
        state.route.passangers = Number(passengersInput.value) || 1;

        updateUrl();
        render();
    });

    searchQueryInput.addEventListener("input", () =>{
        state.searchQuery = searchQueryInput.value;
        render();
    });

    categoryFilter.addEventListener("change", () =>{
        state.selectedCategory = categoryFilter.value;
        render();
    });

    maxPriceInput.addEventListener("input", () => {
        const value = maxPriceInput.value;
        state.maxPrice = value === "" ? null: Number(value);
        render();
    });

    minRatingSelect.addEventListener("change", () => {
        state.minRating = Number(minRatingSelect.value);
        render();
    });

    sortSelect.addEventListener("click", () => {
        state.sortBy = sortSelect.value;
        render();
    });

    resetButton.addEventListener("click", () => {
        state.searchQuery = "";
        state.selectedCategory = "all";
        state.maxPrice = null;
        state.minRating = 0;
        state.sortBy = "date-asc";

        searchQueryInput.value = "";
        categoryFilter.value = "all";
        maxPriceInput.value = "";
        minRatingSelect.value = "0";
        sortSelect.value = "date-asc";

        render();
    });
    
    function openModal() {
        modal.hidden = false;
        document.body.classList.add("modal-open");
        const minDate = dateAfter(0);
        document.querySelector("#ride-date").min = minDate;
        document.querySelector("#ride-from").focus();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove("modal-open");
        rideFormError.textContent = "";
    }

    openModalButton.addEventListener("click", openModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal || event.target.closest("[data-close-modal]")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    function getValidationMessage(input) {
        const label = input.closest(".form-field")?.querySelector("label")?.textContent || "Поле";

        if (input.validity.valueMissing) {
            return `${label}: заполните поле.`;
        }
        if (input.validity.tooShort) {
            return `${label}: слишком короткое значение.`;
        }
        if (input.validity.rangeUnderflow) {
            return `${label}: значение меньше допустимого.`;
        }
        if (input.validity.rangeOverflow) {
            return `${label}: значение больше допустимого.`;
        }
        if (input.validity.stepMismatch) {
            return `${label}: введите корректное число.`;
        }
        return "Проверьте значение поля.";
    }

    function showFieldError(input, message) {
        const errorElement = rideForm.querySelector(`[data-error-for="${input.id}"]`);
        input.setAttribute("aria-invalid", message ? "true" : "false");
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function validateRideForm() {
        const inputs = [...rideForm.querySelectorAll("input")];
        let isValid = true;

        inputs.forEach((input) => {
            if (!input.validity.valid) {
                showFieldError(input, getValidationMessage(input));
                isValid = false;
            } else {
                showFieldError(input, "");
            }
        });

        return isValid;
    }

    rideForm.addEventListener("input", (event) => {
        if (event.target.matches("input") && event.target.validity.valid) {
            showFieldError(event.target, "");
        }
    });

    rideForm.addEventListener("submit", (event) => {
        event.preventDefault();
        rideFormError.textContent = "";

        if (!validateRideForm()) {
            rideFormError.textContent = "Исправьте ошибки в форме и попробуйте ещё раз.";
            return;
        }

        const newRide = {
            id: Date.now(),
            from: document.querySelector("#ride-from").value.trim(),
            to: document.querySelector("#ride-to").value.trim(),
            date: document.querySelector("#ride-date").value,
            time: document.querySelector("#ride-time").value,
            price: Number(document.querySelector("#ride-price").value),
            seats: Number(document.querySelector("#ride-seats").value),
            driver: document.querySelector("#ride-driver").value.trim(),
            rating: 0,
            popularity: 0
        };

        state.items = [...state.items, newRide];
        saveRides(state.items);
        rideForm.reset();
        document.querySelector("#ride-seats").value = "3";
        closeModal();
        render();
    });


    render();
}




initHomePage();
initSearchPage();