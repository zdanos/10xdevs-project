# Dokument wymagań produktu (PRD) - FlashCard AI MVP

## 1. Przegląd produktu

FlashCard AI to aplikacja webowa typu MVP (Minimum Viable Product) zaprojektowana w podejściu mobile-first, która drastycznie skraca czas potrzebny na tworzenie materiałów do nauki. System wykorzystuje sztuczną inteligencję (model GPT-4o-mini) do automatycznego generowania fiszek tekstowych na podstawie notatek wklejonych przez użytkownika. Aplikacja integruje sprawdzony algorytm powtórek SuperMemo 2 (SM-2), umożliwiając efektywną naukę metodą spaced repetition. Celem produktu jest dostarczenie prostego, ale skutecznego narzędzia, które eliminuje barierę wejścia w postaci ręcznego tworzenia kart, zachowując przy tym wysoką jakość merytoryczną dzięki mechanizmowi weryfikacji przez użytkownika.

## 2. Problem użytkownika

Głównym problemem adresowanym przez produkt jest czasochłonność procesu tworzenia wysokiej jakości fiszek edukacyjnych. Użytkownicy chcą korzystać z efektywnej metody spaced repetition, ale proces ręcznego wprowadzania pytań i odpowiedzi jest żmudny i zniechęca do regularności. Istniejące rozwiązania są albo zbyt skomplikowane, albo nie oferują wystarczająco szybkiej konwersji surowego tekstu na materiał do nauki. Użytkownicy potrzebują narzędzia, które pozwoli im skupić się na zapamiętywaniu, a nie na administracji bazą wiedzy.

## 3. Wymagania funkcjonalne

### 3.1. Generowanie i Weryfikacja (Core)

* System umożliwia wklejenie tekstu źródłowego (do 5000 znaków) w dedykowanym formularzu.
* AI przetwarza tekst i zwraca propozycje fiszek (przód/tył) w języku zgodnym z wprowadzonym tekstem.
* System posiada Poczekalnię (Staging Area), gdzie użytkownik musi zweryfikować wygenerowane fiszki przed dodaniem ich do talii.
* Limit generowania wynosi 10 zapytań na dobę na użytkownika.

### 3.2. Nauka i Algorytm

* Implementacja algorytmu SM-2 (SuperMemo 2).
* Interfejs oceny wiedzy z czterostopniową skalą: Again (Powtórz), Hard (Trudne), Good (Dobrze), Easy (Łatwe).
* Sesja nauki kończy się ekranem podsumowania zachęcającym do powrotu następnego dnia.

### 3.3. Zarządzanie Fiszksami

* Możliwość ręcznego dodawania pojedynczych fiszek (tylko tekst).
* Edycja treści istniejących fiszek.
* Usuwanie fiszek z talii.
* Fiszki są organizowane w prostych Taliach (Decks).

### 3.4. Użytkownicy i Technologia

* Rejestracja i logowanie wyłącznie za pomocą Email i Hasła.
* Backend oparty o Supabase (baza danych + autoryzacja).
* Interfejs użytkownika dostępny wyłącznie w trybie jasnym (Light Mode) i języku angielskim.
* Brak wersji natywnej mobile, ale aplikacja webowa jest w pełni responsywna.

## 4. Granice produktu

### Wchodzi w zakres (In Scope)

* Aplikacja webowa.
* Generowanie fiszek tekstowych przez AI.
* Ręczna edycja i tworzenie fiszek.
* Wykorzystanie algorytmu SM-2 z biblioteki open-source.
* Podstawowe zarządzanie kontem (Email/Hasło).

### Nie wchodzi w zakres (Out of Scope)

* Obsługa obrazków, dźwięku, LaTeX i formatowania Markdown.
* Import plików (PDF, DOCX) i skanowanie ze zdjęć (OCR).
* Logowanie społecznościowe (Google, Facebook).
* Współdzielenie talii między użytkownikami.
* Dedykowane aplikacje mobilne (iOS/Android).
* Własny, autorski algorytm powtórek (inny niż SM-2).
* Przycisk Regeneruj dla pojedynczej, błędnej fiszki (wymagana ręczna edycja).
* Internacjonalizacja interfejsu (tylko EN).

## 5. Historyjki użytkowników

### Uwierzytelnianie i Onboarding

ID: US-001
Tytuł: Rejestracja nowego użytkownika
Opis: Jako nowy użytkownik chcę założyć konto używając adresu email i hasła, aby móc zapisywać swoje fiszki.
Kryteria akceptacji:

1. Użytkownik może wprowadzić email i hasło w formularzu rejestracji.
2. Po pomyślnej walidacji konto jest tworzone w Supabase.
3. Użytkownik jest automatycznie zalogowany po rejestracji.
4. Po rejestracji użytkownik jest przekierowywany bezpośrednio do ekranu generowania fiszek (pominiecie ekranów powitalnych).

ID: US-002
Tytuł: Logowanie do systemu
Opis: Jako powracający użytkownik chcę zalogować się na swoje konto, aby uzyskać dostęp do moich talii.
Kryteria akceptacji:

1. Użytkownik może zalogować się podając email i hasło.
2. System wyświetla komunikat błędu przy niepoprawnych danych.
3. Po zalogowaniu widoczny jest pulpit z taliami.

### Generowanie AI

ID: US-003
Tytuł: Generowanie fiszek z tekstu
Opis: Jako użytkownik chcę wkleić notatki do formularza, aby AI stworzyło dla mnie propozycje fiszek.
Kryteria akceptacji:

1. Dostępne pole tekstowe akceptujące do 5000 znaków.
2. Przycisk generowania jest zablokowany, jeśli pole jest puste lub przekroczono limit znaków.
3. System sprawdza dzienny limit (10 użyć); jeśli przekroczony, wyświetla komunikat i blokuje akcję.
4. Po kliknięciu użytkownik widzi stan ładowania, a następnie trafia do Poczekalni.

ID: US-004
Tytuł: Weryfikacja fiszek w Poczekalni (Staging Area)
Opis: Jako użytkownik chcę przejrzeć wygenerowane fiszki przed ich zapisaniem, aby odrzucić błędne propozycje.
Kryteria akceptacji:

1. Wyświetlana jest lista wygenerowanych par przód-tył.
2. Każda fiszka ma opcję Akceptuj (dodaj) i Odrzuć (usuń).
3. Widok na mobile jest czytelny (np. lista wertykalna lub karty swipe).
4. Odrzucone fiszki znikają z listy bez zapisywania w bazie.

ID: US-005
Tytuł: Edycja fiszek w Poczekalni
Opis: Jako użytkownik chcę poprawić treść wygenerowanej fiszki w Poczekalni, aby skorygować błędy AI przed dodaniem do talii.
Kryteria akceptacji:

1. Użytkownik może edytować pole tekstowe przodu i tyłu każdej wygenerowanej fiszki.
2. Zatwierdzenie edytowanej fiszki zapisuje ją w talii ze zmienioną treścią.
3. System rejestruje fakt edycji dla celów analitycznych (metryka jakości).

ID: US-006
Tytuł: Zapisanie zweryfikowanych fiszek
Opis: Jako użytkownik chcę zatwierdzić wybrane fiszki, aby trafiły do mojej talii i harmonogramu nauki.
Kryteria akceptacji:

1. Zaakceptowane fiszki są zapisywane w bazie danych powiązane z użytkownikiem.
2. Nowe fiszki mają domyślny status w algorytmie SM-2 (do nauki).
3. Po przetworzeniu wszystkich fiszek z Poczekalni użytkownik jest przenoszony do widoku talii.

### Zarządzanie Manualne

ID: US-007
Tytuł: Ręczne dodawanie fiszki
Opis: Jako użytkownik chcę ręcznie dodać nową fiszkę wpisując przód i tył, aby uzupełnić braki w materiale.
Kryteria akceptacji:

1. Formularz umożliwia wpisanie przodu i tyłu fiszki.
2. Fiszka jest dodawana do aktualnie wybranej talii.
3. Walidacja zapobiega dodaniu pustej fiszki.

ID: US-008
Tytuł: Zarządzanie talią (Edycja/Usuwanie)
Opis: Jako użytkownik chcę usunąć niepotrzebną fiszkę lub poprawić tekst w istniejącej, aby utrzymać porządek w wiedzy.
Kryteria akceptacji:

1. Użytkownik widzi listę wszystkich fiszek w talii.
2. Możliwość usunięcia konkretnej fiszki (wymagane potwierdzenie).
3. Możliwość edycji treści przodu i tyłu.

### Nauka (Study Mode)

ID: US-009
Tytuł: Sesja nauki na urządzeniu mobilnym
Opis: Jako użytkownik chcę przeprowadzić sesję powtórkową na telefonie, widząc najpierw przód, a potem tył fiszki.
Kryteria akceptacji:

1. Widok nauki jest zoptymalizowany pod dotyk (duże przyciski).
2. Wyświetlany jest tylko przód.
3. Po kliknięciu (np. Pokaż odpowiedź) wyświetlany jest tył i przyciski oceny.

ID: US-010
Tytuł: Ocena znajomości materiału
Opis: Jako użytkownik chcę ocenić, jak dobrze znałem odpowiedź, aby algorytm wyznaczył kolejną datę powtórki.
Kryteria akceptacji:

1. Dostępne 4 przyciski oceny: Again, Hard, Good, Easy.
2. Wybór oceny aktualizuje parametry fiszki w bazie zgodnie z algorytmem SM-2.
3. Po ocenie natychmiast wyświetlana jest kolejna fiszka z kolejki.

ID: US-011
Tytuł: Podsumowanie sesji
Opis: Jako użytkownik chcę zobaczyć ekran końcowy po wyczerpaniu fiszek na dziś, aby poczuć satysfakcję z ukończonej nauki.
Kryteria akceptacji:

1. Ekran pojawia się, gdy nie ma więcej kart do nauki na dany dzień.
2. Wyświetlany komunikat zachęcający do powrotu jutro.
3. Przycisk powrotu do ekranu głównego.

## 6. Metryki sukcesu

### Metryki Akceptacji AI

* Współczynnik akceptacji (AI Acceptance Rate): Procent wygenerowanych przez AI fiszek, które zostały zaakceptowane przez użytkownika (cel: > 75%).
* Współczynnik edycji (Clean vs Edited Ratio): Stosunek fiszek zaakceptowanych bez zmian do fiszek edytowanych w Poczekalni.