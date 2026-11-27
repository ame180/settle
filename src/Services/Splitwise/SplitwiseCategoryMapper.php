<?php

declare(strict_types=1);

namespace App\Services\Splitwise;

use App\Enum\ExpenseCategory;

/**
 * Splitwise category labels in English and Polish, as its exports write them: the subcategory
 * name, or "<Parent> - Other" for the Other subcategories. Source: Splitwise's public
 * GET /api/v3.0/get_categories with Accept-Language en and pl.
 */
class SplitwiseCategoryMapper
{
    private const array PAYMENT_LABELS = ['Payment', 'Płatność'];

    private const array CATEGORIES = [
        'Groceries' => ExpenseCategory::Groceries,
        'Artykuły spożywcze' => ExpenseCategory::Groceries,

        'Dining out' => ExpenseCategory::FoodAndDrink,
        'Jedzenie na mieście' => ExpenseCategory::FoodAndDrink,
        'Liquor' => ExpenseCategory::FoodAndDrink,
        'Alkohol' => ExpenseCategory::FoodAndDrink,
        'Food and drink - Other' => ExpenseCategory::FoodAndDrink,
        'Jedzenie i napoje - Inne' => ExpenseCategory::FoodAndDrink,

        'Bicycle' => ExpenseCategory::Transport,
        'Rower' => ExpenseCategory::Transport,
        'Bus/train' => ExpenseCategory::Transport,
        'Autobus/pociąg' => ExpenseCategory::Transport,
        'Car' => ExpenseCategory::Transport,
        'Samochód' => ExpenseCategory::Transport,
        'Gas/fuel' => ExpenseCategory::Transport,
        'Paliwo' => ExpenseCategory::Transport,
        'Hotel' => ExpenseCategory::Transport,
        'Parking' => ExpenseCategory::Transport,
        'Plane' => ExpenseCategory::Transport,
        'Samolot' => ExpenseCategory::Transport,
        'Taxi' => ExpenseCategory::Transport,
        'Transportation - Other' => ExpenseCategory::Transport,
        'Transport - Inne' => ExpenseCategory::Transport,

        'Cleaning' => ExpenseCategory::HomeAndBills,
        'Sprzątanie' => ExpenseCategory::HomeAndBills,
        'Electricity' => ExpenseCategory::HomeAndBills,
        'Prąd' => ExpenseCategory::HomeAndBills,
        'Heat/gas' => ExpenseCategory::HomeAndBills,
        'Ogrzewanie/gaz' => ExpenseCategory::HomeAndBills,
        'Trash' => ExpenseCategory::HomeAndBills,
        'Śmieci' => ExpenseCategory::HomeAndBills,
        'TV/Phone/Internet' => ExpenseCategory::HomeAndBills,
        'TV/Telefon/Internet' => ExpenseCategory::HomeAndBills,
        'Water' => ExpenseCategory::HomeAndBills,
        'Woda' => ExpenseCategory::HomeAndBills,
        'Utilities - Other' => ExpenseCategory::HomeAndBills,
        'Media - Inne' => ExpenseCategory::HomeAndBills,
        'Electronics' => ExpenseCategory::HomeAndBills,
        'Elektronika' => ExpenseCategory::HomeAndBills,
        'Furniture' => ExpenseCategory::HomeAndBills,
        'Meble' => ExpenseCategory::HomeAndBills,
        'Household supplies' => ExpenseCategory::HomeAndBills,
        'AGD' => ExpenseCategory::HomeAndBills,
        'Maintenance' => ExpenseCategory::HomeAndBills,
        'Utrzymanie' => ExpenseCategory::HomeAndBills,
        'Mortgage' => ExpenseCategory::HomeAndBills,
        'Kredyt' => ExpenseCategory::HomeAndBills,
        'Pets' => ExpenseCategory::HomeAndBills,
        'Zwierzęta' => ExpenseCategory::HomeAndBills,
        'Rent' => ExpenseCategory::HomeAndBills,
        'Czynsz' => ExpenseCategory::HomeAndBills,
        'Services' => ExpenseCategory::HomeAndBills,
        'Usługi' => ExpenseCategory::HomeAndBills,
        'Home - Other' => ExpenseCategory::HomeAndBills,
        'Dom - Inne' => ExpenseCategory::HomeAndBills,

        'Games' => ExpenseCategory::Entertainment,
        'Gry' => ExpenseCategory::Entertainment,
        'Movies' => ExpenseCategory::Entertainment,
        'Filmy' => ExpenseCategory::Entertainment,
        'Music' => ExpenseCategory::Entertainment,
        'Muzyka' => ExpenseCategory::Entertainment,
        'Sports' => ExpenseCategory::Entertainment,
        'Sporty' => ExpenseCategory::Entertainment,
        'Entertainment - Other' => ExpenseCategory::Entertainment,
        'Rozrywka - Inne' => ExpenseCategory::Entertainment,

        'Gifts' => ExpenseCategory::Gifts,
        'Prezenty' => ExpenseCategory::Gifts,

        'Medical expenses' => ExpenseCategory::Health,
        'Wydatki medyczne' => ExpenseCategory::Health,
    ];

    public function isPayment(string $label): bool
    {
        return in_array($label, self::PAYMENT_LABELS, true);
    }

    /** Everything else (General, the rest of Life, unknown labels) is general. */
    public function toCategory(string $label): ExpenseCategory
    {
        return self::CATEGORIES[$label] ?? ExpenseCategory::General;
    }
}
