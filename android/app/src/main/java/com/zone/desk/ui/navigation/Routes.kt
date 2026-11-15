package com.zone.desk.ui.navigation

import android.net.Uri

/**
 * Every destination in Zone. Each web design page maps to one of these routes;
 * helpers keep ids and optional arguments safely encoded.
 */
object Routes {
    const val HOME = "home"
    const val PERSONAL = "personal"
    const val MONEY = "money"
    const val LIBRARY = "library"
    const val SETTINGS = "settings"

    const val DIARY = "diary"
    const val DIARY_NEW = "diary/new"
    const val DIARY_EDIT = "diary/edit/{id}"
    const val DIARY_READ = "diary/read/{id}"

    const val LISTS = "lists"
    const val LISTS_NEW = "lists/new"
    const val LIST_DETAIL = "lists/detail/{id}"

    const val HABITS = "habits"
    const val HABITS_NEW = "habits/new"
    const val HABIT_DETAIL = "habits/detail/{id}"

    const val NOTES = "notes"
    const val NOTES_NEW = "notes/new"
    const val NOTES_EDIT = "notes/edit/{id}"
    const val NOTE_READ = "notes/read/{id}"

    const val LEDGER = "money/ledger"
    const val MONEY_SPENDING = "money/spending"
    const val TXN_NEW = "money/txn/new"
    const val TXN_EDIT = "money/txn/edit/{id}"
    const val PASSBOOK = "passbook"
    const val PASSBOOK_ADD = "passbook/add?account={account}"
    const val ACCOUNT_STATEMENT = "passbook/account/{id}"
    const val SPLIT = "split"
    const val SPLIT_NEW = "split/new"
    const val SPLIT_DETAIL = "split/detail/{id}"
    const val MILEAGE = "mileage"
    const val MILEAGE_NEW = "mileage/new?vehicle={vehicle}"
    const val VEHICLE = "mileage/vehicle/{name}"

    const val WATCHLIST = "watchlist"
    const val WATCH_NEW = "watchlist/new?id={id}"
    const val WATCH_DETAIL = "watchlist/detail/{id}"

    const val SUBSCRIPTIONS = "subscriptions"
    const val SUBSCRIPTION_NEW = "subscriptions/new?id={id}"
    const val SUBSCRIPTION_CALENDAR = "subscriptions/calendar"

    const val LINKS = "links"
    const val LINK_NEW = "links/new?id={id}"
    const val LINK_DETAIL = "links/detail/{id}"

    const val ADMIN = "admin"
    const val UNLOCK = "unlock"
    const val ACTIVITY = "activity"

    val rootRoutes = setOf(HOME, PERSONAL, MONEY, LIBRARY, SETTINGS)

    fun diaryEdit(id: String) = "diary/edit/${Uri.encode(id)}"
    fun diaryRead(id: String) = "diary/read/${Uri.encode(id)}"
    fun listDetail(id: String) = "lists/detail/${Uri.encode(id)}"
    fun habitDetail(id: String) = "habits/detail/${Uri.encode(id)}"
    fun noteEdit(id: String) = "notes/edit/${Uri.encode(id)}"
    fun noteRead(id: String) = "notes/read/${Uri.encode(id)}"
    fun txnEdit(id: String) = "money/txn/edit/${Uri.encode(id)}"
    fun passbookAdd(accountId: String? = null) =
        "passbook/add?account=${Uri.encode(accountId.orEmpty())}"
    fun accountStatement(id: String) = "passbook/account/${Uri.encode(id)}"
    fun splitDetail(id: String) = "split/detail/${Uri.encode(id)}"
    fun mileageNew(vehicle: String? = null) =
        "mileage/new?vehicle=${Uri.encode(vehicle.orEmpty())}"
    fun vehicleDetail(name: String) = "mileage/vehicle/${Uri.encode(name)}"
    fun watchNew(id: String? = null) = "watchlist/new?id=${Uri.encode(id.orEmpty())}"
    fun watchDetail(id: String) = "watchlist/detail/${Uri.encode(id)}"
    fun subscriptionNew(id: String? = null) =
        "subscriptions/new?id=${Uri.encode(id.orEmpty())}"
    fun linkNew(id: String? = null) = "links/new?id=${Uri.encode(id.orEmpty())}"
    fun linkDetail(id: String) = "links/detail/${Uri.encode(id)}"
}
