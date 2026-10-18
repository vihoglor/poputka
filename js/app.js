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
    driverText.append(driverName, driverRating);
    driverInfo.append(avatar, driverText);
    card.append(top, driverInfo);
    return card;

}

function initHomePage() {
    const popularContainer = document.querySelector("#popular-rides");
    const searchForm = document.querySelector("#search-form");

    if(!popularContainer || !searchForm) return;
    const rides = loadRides()

    const popularRides = [...rides]
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 4);

    popularContainer.replaceChildren();
    popularRides.forEach((ride) => {
        const card = buildRideCard(ride);
        const btn = createElement("a", "btn-secondary btn-rides", "Найти поездку");
        const params = new URLSearchParams({
            from: ride.from,
            to: ride.to,
            date: ride.date,
            seats: "1"
        });
        btn.href = `../poputka/search.html?${params.toString()}`;

        card.append(btn);
        popularContainer.append(card);
    });
    
}



// Поиск

searchForm = document.querySelector("#search-form");
searchForm.addEventListener("submit", (event) =>{
    event.preventDefault();
    const from = document.querySelector("#from").value.trim();
    const to = document.querySelector("#to").value.trim();
    const date = document.querySelector("#date").value;
    const passengers = document.querySelector("#passengers").value || "1";

    const params = new URLSearchParams({
        from, to, date, seats: passengers
    });

    window.location.href = `../poputka/search.html?${params.toString()}`;
});


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
    const minRatingInput = document.querySelector("#min-rating");
    const sortSelect = document.querySelector("#sort-by");
    const resetButton = document.querySelector("#reset-filters");
    const resultsCount = document.querySelector("#results-count");



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
    console.log(fromInput);
}


initHomePage();
initSearchPage();