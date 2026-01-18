# Plan Testów - FlashCard AI

## 1. Wprowadzenie i Cele
Celem niniejszego planu jest zdefiniowanie strategii zapewnienia jakości (QA) dla projektu FlashCard AI – aplikacji mobilnej web (MVP) służącej do generowania i nauki fiszek z wykorzystaniem AI.
Głównym celem testów jest weryfikacja poprawności działania algorytmu nauki (SM-2), niezawodności integracji z OpenAI oraz bezpieczeństwa danych użytkowników, przy zachowaniu wysokiej użyteczności na urządzeniach mobilnych.

## 2. Zakres Testów
Plan obejmuje testowanie następujących obszarów:
*   **Logika Biznesowa (Backend)**: Serwisy w `src/lib/services` (Study, Deck, Flashcard, OpenAI, Quota).
*   **Interfejs API**: Endpointy w `src/pages/api`.
*   **Baza Danych**: Spójność danych, poprawne działanie polityk RLS (Row Level Security) w Supabase.
*   **Frontend (UI/UX)**: Komponenty React, formularze, interakcje w trybie nauki, responsywność (Mobile-first).
*   **Integracje**: OpenAI API (mockowane w testach auto, weryfikowane w smoke testach).

**Wyłączenia z zakresu**:
*   Testy wydajnościowe/obciążeniowe (na etapie MVP ruch jest przewidywalny).
*   Testy bezpieczeństwa penetracyjnego (polegamy na zabezpieczeniach Supabase Auth).

## 3. Typy Testów

### 3.1. Testy Jednostkowe (Unit Tests)
*   **Cel**: Izolowana weryfikacja logiki funkcji i klas.
*   **Narzędzie**: `Vitest`.
*   **Zakres**:
    *   `src/lib/services/study.service.ts`: Weryfikacja obliczeń algorytmu SM-2 (interwały, EF, daty).
    *   `src/lib/utils.ts`: Funkcje pomocnicze.
    *   `src/lib/validators`: Poprawność schematów Zod.
    *   Komponenty React (w izolacji, np. stany przycisków).

### 3.2. Testy Integracyjne (Integration Tests)
*   **Cel**: Weryfikacja współpracy między modułami (Service <-> Supabase Client).
*   **Narzędzie**: `Vitest` + Mocki Supabase lub Lokalna Instancja Supabase.
*   **Zakres**:
    *   CRUD operacje na taliach i fiszkach.
    *   Generowanie fiszek (mockowana odpowiedź OpenAI -> zapis do DB -> aktualizacja Quota).
    *   Endpointy API (request/response flow).

### 3.3. Testy E2E (End-to-End)
*   **Cel**: Symulacja zachowania użytkownika na gotowej aplikacji.
*   **Narzędzie**: `Playwright`.
*   **Zakres**:
    *   Pełne ścieżki krytyczne (Rejestracja -> Generowanie -> Nauka).
    *   Testy responsywności (viewporty mobilne: iPhone SE, Pixel 5).

## 4. Scenariusze Testowe dla Kluczowych Funkjonalności

### 4.1. Moduł Nauki (Algorytm SM-2)
| ID | Scenariusz | Oczekiwany Rezultat | Priorytet |
|----|------------|---------------------|-----------|
| S-01 | Ocena "Dobra" (4) dla nowej fiszki | Karta znika z kolejki "na dziś", interwał ustawiony na 1 dzień. | P0 |
| S-02 | Ocena "Pamiętam" (5) dla fiszki z interwałem > 1 | Interwał rośnie zgodnie z wzorem, Easiness Factor rośnie. | P0 |
| S-03 | Ocena "Nie wiem" (1) | Interwał resetowany do 1, Easiness Factor maleje (nie poniżej 1.3). | P0 |
| S-04 | Pobranie kolejki nauki | Zwraca tylko karty gdzie `next_review_date` <= `NOW()`, posortowane od najstarszych. | P0 |

### 4.2. Generowanie Fiszek (AI)
| ID | Scenariusz | Oczekiwany Rezultat | Priorytet |
|----|------------|---------------------|-----------|
| G-01 | Generowanie z poprawnego tekstu | Utworzenie 3-8 fiszek, odjęcie tokenów z limitu użytkownika. | P0 |
| G-02 | Próba generowania pustego tekstu | Błąd walidacji, brak zapytania do OpenAI. | P1 |
| G-03 | Błąd API OpenAI (np. 500) | Obsługa błędu, brak utraty tokenów z limitu użytkownika. | P1 |
| G-04 | Przekroczenie limitu (Quota) | Blokada generowania, komunikat dla użytkownika o konieczności odczekania. | P1 |

### 4.3. Zarządzanie Taliami i Autoryzacja
| ID | Scenariusz | Oczekiwany Rezultat | Priorytet |
|----|------------|---------------------|-----------|
| D-01 | Dostęp do cudzej talii przez URL | Błąd 403/404 lub przekierowanie (RLS policy działa). | P0 |
| D-02 | Usunięcie talii | Kaskadowe usunięcie wszystkich fiszek w talii. | P1 |

## 5. Środowisko Testowe
*   **Local**: Deweloper uruchamia testy jednostkowe (`npm run test`) przed commitem.
*   **CI (GitHub Actions)**: Automatyczne uruchamianie testów jednostkowych i linterów przy każdym Pull Request.
*   **Mockowanie**:
    *   `OpenAI`: Należy używać nagranych odpowiedzi (fixtures) lub mocków, aby uniknąć kosztów.
    *   `Supabase`: W testach jednostkowych mockujemy klienta. W E2E testujemy na dedykowanym projekcie testowym lub lokalnym kontenerze Supabase.

## 6. Narzędzia
W projekcie brakuje obecnie skonfigurowanych narzędzi testowych. Rekomendowany zestaw (do zainstalowania):
1.  **Vitest**: Główny runner testów (kompatybilny z Vite/Astro).
2.  **@testing-library/react**: Do testowania komponentów UI.
3.  **Playwright**: Do testów E2E (wspiera silniki WebKit/Chromium/Firefox i emulację mobile).
4.  **msw (Mock Service Worker)**: Opcjonalnie do mockowania odpowiedzi HTTP OpenAI.

## 7. Harmonogram Testów
1.  **Tydzień 1**: Konfiguracja środowiska (Vitest + Playwright). Napisanie testów jednostkowych dla `study.service.ts` (Krytyczne).
2.  **Tydzień 2**: Testy integracyjne dla endpointu `generate-flashcards`.
3.  **Tydzień 3**: Smoke testy E2E dla ścieżki "Login -> Create Deck -> Generate".

## 8. Kryteria Akceptacji
*   100% testów jednostkowych dla `study.service.ts` przechodzi pomyślnie.
*   Brak błędów krytycznych (blokujących główny flow) w testach E2E.
*   Kod przechodzi weryfikację linterem (`eslint`) i formatterem (`prettier`).
*   Pokrycie kodu (Code Coverage) dla serwisów biznesowych > 80%.

## 9. Role i Odpowiedzialności
*   **Developer**: Pisze testy jednostkowe do swojego kodu (TDD mile widziane). Odpowiada za utrzymanie testów w zielonym stanie.
*   **QA Engineer (Rola symulowana)**: Projektuje przypadki testowe E2E, weryfikuje trudne przypadki brzegowe, zarządza strategią testowania AI.

## 10. Procedury Raportowania Błędów
Błędy zgłaszane są w GitHub Issues z etykietą `bug`. Zgłoszenie musi zawierać:
1.  **Kroki do reprodukcji** (dokładna ścieżka).
2.  **Oczekiwany rezultat**.
3.  **Rzeczywisty rezultat**.
4.  **Kontekst**: Urządzenie, przeglądarka, logi z konsoli (jeśli dotyczy).
5.  **Priorytet** (Blocker, Critical, Major, Minor).
