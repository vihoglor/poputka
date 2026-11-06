from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_no_docs_and_pages_in_repository_root():
    assert not (ROOT / 'docs').exists()
    assert (ROOT / 'index.html').exists()
    assert (ROOT / '.nojekyll').exists()


def test_navigation_and_home_sections():
    pages = ['index.html', 'search.html', 'account.html', 'auth.html', 'create-trip.html', 'trip.html']
    for page in pages:
        html = (ROOT / page).read_text(encoding='utf-8')
        assert 'data-auth-link href="./auth.html?next=account.html">Личный кабинет' in html
        assert 'href="./create-trip.html">Предложить поездку' in html
    home = (ROOT / 'index.html').read_text(encoding='utf-8')
    assert home.index('Просто по пути') < home.index('Предложить свой маршрут')
    assert home.index('class="steps-section"') < home.index('class="offer-section"')


def test_booking_action_and_avatar():
    js = (ROOT / 'js/app.js').read_text(encoding='utf-8')
    account = (ROOT / 'account.html').read_text(encoding='utf-8')
    assert "action.textContent = showBookingAction ? 'Бронь'" in js
    assert "showBookingAction && !state.user ? `./auth.html?next=" in js
    assert 'id="change-avatar"' in account
    assert 'id="avatar-file"' in account
    assert "api('/api/users/me/avatar', { method: 'POST'" in js
    assert "api('/api/users/me/avatar', { method: 'DELETE'" in js
