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

function loadRides() {
    let saved;

    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.error("Не удалось прочитать localStorage:", error);
        return defaultRides.map((ride) => ({ ...ride }));
    }

    if (saved === null) {
        return defaultRides.map((ride) => ({ ...ride }));
    }

    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
    } catch (error) {
        console.error("Ошибка чтения данных поездок:", error);
    }

    return defaultRides.map((ride) => ({ ...ride }));
}

const initialParams = new URLSearchParams(window.location.search);

const state = (window.state = {
    items: loadRides(),
    route: {
        from: initialParams.get("from") || "",
        to: initialParams.get("to") || "",
        date: initialParams.get("date") || "",
        passengers: Number(initialParams.get("seats")) || 1
    },
    searchQuery: "",
    selectedCategory: "all",
    maxPrice: null,
    minRating: 0,
    sortBy: "date-asc"
});

function saveRides() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (error) {
        console.error("Не удалось сохранить поездки:", error);
    }
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function dateAfter(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

function buildRideCard(ride) {
    const card = createElement("div", "ride-card glass-element");

    const top = createElement("div", "ride-card-top");
    const header = createElement("div", "ride-header");
    const price = createElement(
        "span",
        "ride-price",
        String(ride.price) + " ₽ / место"
    );
    const seats = createElement(
        "span",
        "ride-seats",
        String(ride.seats) + " места"
    );

    header.append(price, seats);

    const timeBlock = createElement("div", "ride-time-block");
    const time = createElement("span", "ride-time", String(ride.time || ""));

    const dateValue = new Date(String(ride.date || "") + "T00:00:00");

    const formattedDate = Number.isNaN(dateValue.getTime())
        ? String(ride.date || "")
        : dateValue.toLocaleDateString("ru-RU");

    const date = createElement("span", "ride-date", formattedDate);

    timeBlock.append(time, date);

    const city = createElement(
        "span",
        "ride-city",
        String(ride.from || "") + " → " + String(ride.to || "")
    );

    top.append(header, timeBlock, city);

    const driverInfo = createElement("div", "driver-info");
    const avatar = createElement("div", "driver-avatar");
    const driverText = createElement("div", "driver-info-block");

    const driverName = createElement(
        "div",
        "driver-name",
        String(ride.driver || "")
    );

    const driverRating = createElement(
        "div",
        "driver-rating",
        "★ " + String(ride.rating ?? 0)
    );

    const bookingButton = createElement(
        "a",
        "btn-secondary btn-rides",
        "Забронировать"
    );

    bookingButton.addEventListener("click", (event) => {
        event.preventDefault();
        alert("Поездка забронирована");
    });

    driverText.append(driverName, driverRating);
    driverInfo.append(avatar, driverText);

    card.append(top, driverInfo, bookingButton);

    return card;
}

function getVisibleRides() {
    const filtered = state.items.filter((ride) => {
        const routeFromMatches =
            !state.route.from ||
            normalize(ride.from) === normalize(state.route.from);

        const routeToMatches =
            !state.route.to ||
            normalize(ride.to) === normalize(state.route.to);

        const dateMatches =
            !state.route.date || ride.date === state.route.date;

        const passengersMatch =
            Number(ride.seats) >= state.route.passengers;

        const searchableText = normalize(
            String(ride.driver || "") +
            " " +
            String(ride.from || "") +
            " " +
            String(ride.to || "")
        );

        const searchMatches =
            !state.searchQuery ||
            searchableText.includes(normalize(state.searchQuery));

        const priceMatches =
            state.maxPrice === null ||
            Number(ride.price) <= state.maxPrice;

        const ratingMatches =
            Number(ride.rating ?? 0) >= state.minRating;

        const categoryMatches =
            state.selectedCategory === "all" ||
            (
                state.selectedCategory === "one" &&
                Number(ride.seats) === 1
            ) ||
            (
                state.selectedCategory === "two" &&
                Number(ride.seats) === 2
            ) ||
            (
                state.selectedCategory === "three-plus" &&
                Number(ride.seats) >= 3
            );

        return routeFromMatches
            && routeToMatches
            && dateMatches
            && passengersMatch
            && searchMatches
            && priceMatches
            && ratingMatches
            && categoryMatches;
    });

    return [...filtered].sort((a, b) => {
        const aDateTime =
            String(a.date || "") + " " + String(a.time || "");

        const bDateTime =
            String(b.date || "") + " " + String(b.time || "");

        if (state.sortBy === "date-desc") {
            return bDateTime.localeCompare(aDateTime);
        }

        if (state.sortBy === "price-asc") {
            return Number(a.price) - Number(b.price);
        }

        if (state.sortBy === "price-desc") {
            return Number(b.price) - Number(a.price);
        }

        return aDateTime.localeCompare(bDateTime);
    });
}

function renderCityOptions(items, property, dropdown) {
    if (!dropdown) {
        return;
    }

    const values = [...new Set(
        items
            .map((ride) => String(ride[property] ?? "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "ru"));

    dropdown.replaceChildren();

    values.forEach((value) => {
        const option = createElement("li", "", value);

        option.dataset.value = value;
        option.setAttribute("role", "option");

        dropdown.append(option);
    });
}

function initCustomDropdown(input, dropdown) {
    if (!input || !dropdown) {
        return;
    }

    function filterOptions() {
        const filterText = normalize(input.value);

        dropdown.querySelectorAll("li").forEach((option) => {
            const cityValue = normalize(option.dataset.value);

            option.style.display = cityValue.includes(filterText)
                ? ""
                : "none";
        });

        dropdown.classList.add("show");
    }

    input.addEventListener("focus", filterOptions);
    input.addEventListener("input", filterOptions);

    dropdown.addEventListener("click", (event) => {
        const option = event.target.closest
            ? event.target.closest("li[data-value]")
            : null;

        if (!option || !dropdown.contains(option)) {
            return;
        }

        input.value = option.dataset.value;
        dropdown.classList.remove("show");
    });

    document.addEventListener("click", (event) => {
        if (
            !input.contains(event.target) &&
            !dropdown.contains(event.target)
        ) {
            dropdown.classList.remove("show");

            dropdown.querySelectorAll("li").forEach((option) => {
                option.style.display = "";
            });
        }
    });
}

function render() {
    const popularContainer = document.querySelector("#popular-rides");

    if (popularContainer) {
        console.log(state.items);
        const popularRides = [...state.items]
            .sort(
                (a, b) =>
                    Number(b.popularity ?? 0) -
                    Number(a.popularity ?? 0)
            )
            .slice(0, 4);

        popularContainer.replaceChildren();

        popularRides.forEach((ride) => {
            popularContainer.append(buildRideCard(ride));
        });
    }

    const routesContainer = document.querySelector("#routes");

    if (routesContainer) {
        renderCityOptions(
            state.items,
            "from",
            document.querySelector("#from-dropdown")
        );

        renderCityOptions(
            state.items,
            "to",
            document.querySelector("#to-dropdown")
        );

        const visibleRides = getVisibleRides();
        const resultsCount = document.querySelector("#results-count");

        routesContainer.replaceChildren();

        if (resultsCount) {
            resultsCount.textContent = visibleRides.length === 0
                ? "Подходящих поездок нет"
                : "Найдено поездок: " + visibleRides.length;
        }

        visibleRides.forEach((ride) => {
            routesContainer.append(buildRideCard(ride));
        });
    }
}

function updateUrl() {
    const params = new URLSearchParams();

    if (state.route.from) {
        params.set("from", state.route.from);
    }

    if (state.route.to) {
        params.set("to", state.route.to);
    }

    if (state.route.date) {
        params.set("date", state.route.date);
    }

    params.set("seats", String(state.route.passengers));

    const query = params.toString();

    const nextUrl =
        window.location.pathname + (query ? "?" + query : "");

    window.history.replaceState(null, "", nextUrl);
}

function initHomePage() {
    const popularContainer = document.querySelector("#popular-rides");
    const searchForm = document.querySelector("#search-form");

    if (!popularContainer || !searchForm) {
        return;
    }

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

        window.location.href = "./search.html?" + params.toString();
    });
    popularContainer.addEventListener("click", handleRideDelete);
}

function initSearchPage() {
    const routesContainer = document.querySelector("#routes");

    if (!routesContainer) {
        return;
    }

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

    fromInput.value = state.route.from;
    toInput.value = state.route.to;
    dateInput.value = state.route.date;
    passengersInput.value = String(state.route.passengers);

    searchQueryInput.value = state.searchQuery;
    categoryFilter.value = state.selectedCategory;

    maxPriceInput.value =
        state.maxPrice === null ? "" : String(state.maxPrice);

    minRatingSelect.value = String(state.minRating);
    sortSelect.value = state.sortBy;

    initCustomDropdown(
        fromInput,
        document.querySelector("#from-dropdown")
    );

    initCustomDropdown(
        toInput,
        document.querySelector("#to-dropdown")
    );

    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        state.route.from = fromInput.value.trim();
        state.route.to = toInput.value.trim();
        state.route.date = dateInput.value;

        state.route.passengers =
            Number(passengersInput.value) || 1;

        updateUrl();
        render();
    });

    searchQueryInput.addEventListener("input", () => {
        state.searchQuery = searchQueryInput.value;
        render();
    });

    categoryFilter.addEventListener("change", () => {
        state.selectedCategory = categoryFilter.value;
        render();
    });

    maxPriceInput.addEventListener("input", () => {
        state.maxPrice =
            maxPriceInput.value === ""
                ? null
                : Number(maxPriceInput.value);

        render();
    });

    minRatingSelect.addEventListener("change", () => {
        state.minRating = Number(minRatingSelect.value);
        render();
    });

    sortSelect.addEventListener("change", () => {
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

    routesContainer.addEventListener("click", handleRideDelete);
}

function initRideModal() {
    const modal = document.querySelector("#ride-modal");
    const openModalButton =
        document.querySelector("#open-ride-modal");

    const rideForm = document.querySelector("#ride-form");
    const rideFormError =
        document.querySelector("#ride-form-error");

    const rideDateInput = document.querySelector("#ride-date");
    const rideSeatsInput = document.querySelector("#ride-seats");

    if (
        !modal ||
        !openModalButton ||
        !rideForm ||
        !rideFormError
    ) {
        return;
    }

    function showFieldError(input, message) {
        const errorElement = rideForm.querySelector(
            '[data-error-for="' + input.id + '"]'
        );

        input.setAttribute(
            "aria-invalid",
            message ? "true" : "false"
        );

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

        rideDateInput.min = dateAfter(0);

        clearFormErrors();

        document.querySelector("#ride-from").focus();
    }

    function closeModal() {
        modal.hidden = true;

        document.body.classList.remove("modal-open");

        rideFormError.textContent = "";
    }

    function getValidationMessage(input) {
        const label =
            input.closest(".form-field")
                ?.querySelector("label")
                ?.textContent.trim() || "Поле";

        const validity = input.validity;

        if (validity.valueMissing) {
            return label + ": заполните поле.";
        }

        if (validity.tooShort) {
            return label +
                ": введите не менее " +
                input.minLength +
                " символов.";
        }

        if (validity.tooLong) {
            return label +
                ": введите не более " +
                input.maxLength +
                " символов.";
        }

        if (
            validity.rangeUnderflow &&
            input.type === "date"
        ) {
            return label +
                ": выберите дату не раньше сегодня.";
        }

        if (validity.rangeUnderflow) {
            return label + ": значение меньше допустимого.";
        }

        if (validity.rangeOverflow) {
            return label + ": значение больше допустимого.";
        }

        if (validity.stepMismatch) {
            return label + ": введите корректное число.";
        }

        if (validity.badInput || validity.typeMismatch) {
            return label + ": проверьте формат значения.";
        }

        return "Проверьте значение поля.";
    }

    function validateRideForm() {
        let isValid = true;

        rideForm.querySelectorAll("input").forEach((input) => {
            if (!input.validity.valid) {
                showFieldError(
                    input,
                    getValidationMessage(input)
                );

                isValid = false;
            } else {
                showFieldError(input, "");
            }
        });

        return isValid;
    }

    openModalButton.addEventListener("click", openModal);

    modal.addEventListener("click", (event) => {
        const clickedCloseButton = event.target.closest
            ? event.target.closest("[data-close-modal]")
            : null;

        if (
            event.target === modal ||
            clickedCloseButton
        ) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) {
            closeModal();
        }
    });

    rideForm.addEventListener("input", (event) => {
        const input = event.target;

        if (
            input.matches("input") &&
            input.validity.valid
        ) {
            showFieldError(input, "");
        }

        if (
            [...rideForm.querySelectorAll("input")]
                .every((field) => field.validity.valid)
        ) {
            rideFormError.textContent = "";
        }
    });

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

            from: rideForm
                .querySelector("#ride-from")
                .value.trim(),

            to: rideForm
                .querySelector("#ride-to")
                .value.trim(),

            date: rideForm
                .querySelector("#ride-date")
                .value,

            time: rideForm
                .querySelector("#ride-time")
                .value,

            price: Number(
                rideForm.querySelector("#ride-price").value
            ),

            seats: Number(
                rideForm.querySelector("#ride-seats").value
            ),

            driver: rideForm
                .querySelector("#ride-driver")
                .value.trim(),

            rating: 0,
            popularity: 0
        };

        state.items = [...state.items, newRide];

        saveRides();

        rideForm.reset();

        rideSeatsInput.value = "3";

        clearFormErrors();
        closeModal();
        render();
    });
}

initHomePage();
initSearchPage();
initRideModal();

render();
