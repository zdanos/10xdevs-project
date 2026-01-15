# Plan Schematu Bazy Danych - FlashCard AI MVP

Ten dokument opisuje schemat bazy danych PostgreSQL dla aplikacji FlashCard AI (MVP) oparty na Supabase. Projekt uwzględnia wymagania funkcjonalne (PRD), stack technologiczny oraz decyzje podjęte podczas sesji planowania.

## 1. Konfiguracja i Rozszerzenia

Przed utworzeniem tabel należy włączyć następujące rozszerzenia:

* `moddatetime`: Do automatycznej aktualizacji kolumny `updated_at`.

### Typy wyliczeniowe (ENUMs)

* `card_source_type`: Definiuje pochodzenie fiszki.
* Wartości: `'AI'`, `'EditedAI'`, `'Manual'`



## 2. Lista Tabel

### Tabela: `profiles`

Rozszerzenie tabeli `auth.users`. Przechowuje dane o limitach i aktywności użytkownika.

| Nazwa Kolumny | Typ Danych | Ograniczenia (Constraints) | Opis |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK`, `FK -> auth.users.id`, `ON DELETE CASCADE` | Klucz główny, tożsamy z ID użytkownika w Supabase Auth. |
| `generations_count` | `INTEGER` | `DEFAULT 0`, `NOT NULL` | Licznik wygenerowanych zapytań AI w bieżącym cyklu. |
| `last_reset_date` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data ostatniego resetu licznika limitów (UTC). |
| `last_generation_date` | `TIMESTAMPTZ` | `NULLABLE` | Data ostatniej interakcji z generatorem (dla UI). |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data utworzenia profilu. |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data ostatniej modyfikacji. |

### Tabela: `decks`

Kontenery organizujące fiszki.

| Nazwa Kolumny | Typ Danych | Ograniczenia (Constraints) | Opis |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unikalny identyfikator talii. |
| `user_id` | `UUID` | `FK -> profiles.id`, `NOT NULL`, `ON DELETE CASCADE` | Właściciel talii. |
| `name` | `TEXT` | `NOT NULL` | Nazwa talii. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data utworzenia. |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data ostatniej modyfikacji. |

### Tabela: `generation_logs`

Logi operacji generowania AI, służące do analityki i obliczania metryk (Acceptance Rate).

| Nazwa Kolumny | Typ Danych | Ograniczenia (Constraints) | Opis |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unikalny identyfikator sesji generowania. |
| `user_id` | `UUID` | `FK -> profiles.id`, `NOT NULL` | Użytkownik generujący. |
| `generated_count` | `INTEGER` | `NOT NULL` | Liczba fiszek zaproponowanych przez AI w tej sesji. |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data wykonania generowania. |

### Tabela: `flashcards`

Główna tabela przechowująca treść fiszek oraz stan algorytmu SM-2.

| Nazwa Kolumny | Typ Danych | Ograniczenia (Constraints) | Opis |
| --- | --- | --- | --- |
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unikalny identyfikator fiszki. |
| `deck_id` | `UUID` | `FK -> decks.id`, `NOT NULL`, `ON DELETE CASCADE` | Przypisanie do talii. |
| `user_id` | `UUID` | `FK -> profiles.id`, `NOT NULL` | Właściciel (zdenormalizowane dla wydajności RLS). |
| `front` | `VARCHAR(200)` | `NOT NULL` | Treść pytania (limit 200 znaków). |
| `back` | `VARCHAR(500)` | `NOT NULL` | Treść odpowiedzi (limit 500 znaków). |
| `creation_source` | `card_source_type` | `NOT NULL`, `DEFAULT 'Manual'` | Źródło fiszki (AI/EditedAI/Manual). |
| `generation_id` | `UUID` | `FK -> generation_logs.id`, `NULLABLE`, `ON DELETE SET NULL` | Powiązanie z logiem generowania (dla metryk). |
| **Pola SM-2** |  |  |  |
| `repetition_number` | `INTEGER` | `DEFAULT 0`, `NOT NULL` | Liczba powtórzeń (n). |
| `easiness_factor` | `FLOAT` | `DEFAULT 2.5`, `NOT NULL` | Współczynnik łatwości (EF). |
| `interval` | `INTEGER` | `DEFAULT 0`, `NOT NULL` | Interwał w dniach (I). |
| `next_review_date` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data następnej powtórki. |
| **Metadane** |  |  |  |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data utworzenia. |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Data ostatniej modyfikacji. |

## 3. Relacje (Entity Relationship)

1. **Users -> Profiles**: Relacja 1:1.
* Każdy użytkownik w `auth.users` ma jeden profil w `public.profiles`.
* Usunięcie użytkownika kaskadowo usuwa profil.


2. **Profiles -> Decks**: Relacja 1:N (Jeden do Wielu).
* Jeden profil może mieć wiele talii.
* Usunięcie profilu usuwa wszystkie talie.


3. **Decks -> Flashcards**: Relacja 1:N (Jeden do Wielu).
* Jedna talia zawiera wiele fiszek.
* Usunięcie talii usuwa wszystkie zawarte w niej fiszki.


4. **Profiles -> Generation Logs**: Relacja 1:N.
* Jeden użytkownik ma historię wielu generowań.


5. **Generation Logs -> Flashcards**: Relacja 1:N (Opcjonalna).
* Jedno generowanie może skutkować utworzeniem wielu fiszek.
* Pozwala to na obliczenie: `(COUNT(flashcards) WHERE generation_id = X) / generation_logs.generated_count` = % akceptacji.



## 4. Indeksy

Indeksy zostały dobrane pod kątem optymalizacji widoku nauki (Study Mode) oraz bezpieczeństwa (RLS).

1. **`flashcards_study_idx`**: Złożony indeks dla najczęstszego zapytania (pobieranie kart do nauki).
* Kolumny: `(user_id, deck_id, next_review_date)`


2. **`flashcards_deck_id_idx`**: Dla szybkiego filtrowania po talii.
* Kolumny: `(deck_id)`


3. **`decks_user_id_idx`**: Dla szybkiego listowania talii użytkownika.
* Kolumny: `(user_id)`


4. **`generation_logs_user_id_idx`**: Dla historii generowań.
* Kolumny: `(user_id)`



## 5. Row Level Security (RLS)

Polityki bezpieczeństwa są obowiązkowe dla wszystkich tabel publicznych.

* **Zasada ogólna**: Użytkownik może widzieć i modyfikować tylko wiersze, gdzie `user_id` (lub `id` w przypadku tabeli `profiles`) jest równe `auth.uid()`.

### Szczegółowe polityki:

1. **Profiles**:
* `SELECT`: Użytkownik widzi tylko swój profil.
* `UPDATE`: Użytkownik może aktualizować tylko swój profil (choć logika liczników będzie obsługiwana głównie przez funkcje systemowe).
* `INSERT`: Obsługiwane przez trigger po rejestracji (Security Definer).


2. **Decks**:
* `ALL` (Select, Insert, Update, Delete): `user_id = auth.uid()`.


3. **Flashcards**:
* `ALL` (Select, Insert, Update, Delete): `user_id = auth.uid()`.


4. **Generation Logs**:
* `SELECT`: `user_id = auth.uid()`.
* `INSERT`: `user_id = auth.uid()` (tylko backend/funkcja może wstawiać, ale użytkownik inicjuje).



## 6. Procedury Składowane i Triggery (Logika Biznesowa)

Ze względu na wymagania "Lazy Reset" i spójności danych, część logiki znajduje się w bazie danych.

### 1. Funkcja `handle_new_user` (Trigger)

* **Cel**: Automatyczne tworzenie rekordu w `profiles` po rejestracji w `auth.users`.
* **Uruchamianie**: `AFTER INSERT ON auth.users`.

### 2. Funkcja `check_quota` (RPC)

* **Cel**: Sprawdzenie dostępności limitu 10 generowań na dobę (operacja tylko do odczytu).
* **Logika**:
1. Pobierz `generations_count` i `last_reset_date` dla usera.
2. Sprawdź, czy od `last_reset_date` minęło więcej niż 24h.
3. Jeśli tak: zresetuj `generations_count` do 0 i ustaw `last_reset_date` na `NOW()` (ale NIE zwiększaj licznika).
4. Oblicz czy użytkownik może generować: `can_generate = generations_count < 10`.
5. Oblicz pozostałe generowania: `quota_remaining = 10 - generations_count`.


* **Zwraca**: JSON z polami: `can_generate`, `quota_remaining`, `current_count`, `hours_until_reset`.
* **Efekty uboczne**: Może zresetować licznik (jeśli minęło 24h), ale NIE zwiększa go ani nie tworzy wpisów w `generation_logs`.

### 3. Funkcja `record_generation` (RPC)

* **Cel**: Rejestracja udanego generowania i konsumpcja limitu z rzeczywistą liczbą wygenerowanych fiszek.
* **Parametry**: `p_generated_count` (INTEGER) - faktyczna liczba fiszek zwrócona przez AI.
* **Logika**:
1. Sprawdź aktualny stan `generations_count` dla usera.
2. Zwiększ `generations_count` o +1 z optymistycznym blokadą (`WHERE generations_count < 10`).
3. Jeśli aktualizacja się nie powiodła (limit został osiągnięty w międzyczasie): Rzuć wyjątek.
4. Jeśli sukces: Dodaj wpis do `generation_logs` z faktyczną liczbą wygenerowanych fiszek (`p_generated_count`).
5. Zaktualizuj `last_generation_date` na `NOW()`.


* **Zwraca**: JSON z polami: `generation_log_id`, `generations_count`, `quota_remaining`.
* **Zabezpieczenia**: Optymistyczne blokowanie (`WHERE generations_count < 10`) chroni przed race conditions w przypadku równoczesnych żądań.

**Architektura dwufazowa:**
- **Faza 1 (check_quota)**: Sprawdzenie przed generowaniem - bez efektów ubocznych na licznik.
- **Faza 2 (record_generation)**: Rejestracja po udanym generowaniu - konsumpcja limitu z dokładnymi danymi.

**Korzyści:**
- Limit konsumowany tylko po udanym generowaniu AI.
- Dokładne dane w `generation_logs` (rzeczywiste liczby, nie szacunki).
- Sprawiedliwe dla użytkowników (brak utraty limitu przy błędach systemu).
- `generation_id` umożliwia dokładne śledzenie metryk (AI Acceptance Rate, Clean vs Edited Ratio).

### 4. Trigger `handle_updated_at`

* **Cel**: Automatyczna aktualizacja pola `updated_at` przy każdej modyfikacji rekordu.
* **Zastosowanie**: Tabele `profiles`, `decks`, `flashcards`.

## 7. Uwagi Dodatkowe

* **Poczekalnia (Staging Area)**: Zgodnie z ustaleniami, fiszki w poczekalni **nie są** zapisywane w bazie danych. Trafiają do tabeli `flashcards` dopiero po zatwierdzeniu przez użytkownika.