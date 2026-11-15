package com.zone.desk.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.screens.AccountStatementScreen
import com.zone.desk.ui.screens.ActivityScreen
import com.zone.desk.ui.screens.AdminScreen
import com.zone.desk.ui.screens.DiaryEditorScreen
import com.zone.desk.ui.screens.DiaryListScreen
import com.zone.desk.ui.screens.DiaryReaderScreen
import com.zone.desk.ui.screens.HabitDetailScreen
import com.zone.desk.ui.screens.HabitNewScreen
import com.zone.desk.ui.screens.HabitsScreen
import com.zone.desk.ui.screens.HomeScreen
import com.zone.desk.ui.screens.LedgerScreen
import com.zone.desk.ui.screens.LibraryScreen
import com.zone.desk.ui.screens.LinkDetailScreen
import com.zone.desk.ui.screens.LinkFormScreen
import com.zone.desk.ui.screens.LinksScreen
import com.zone.desk.ui.screens.ListDetailScreen
import com.zone.desk.ui.screens.ListNewScreen
import com.zone.desk.ui.screens.ListsScreen
import com.zone.desk.ui.screens.MileageNewScreen
import com.zone.desk.ui.screens.MileageScreen
import com.zone.desk.ui.screens.MoneyHubScreen
import com.zone.desk.ui.screens.NoteEditorScreen
import com.zone.desk.ui.screens.NoteReaderScreen
import com.zone.desk.ui.screens.NotesScreen
import com.zone.desk.ui.screens.PassbookAddScreen
import com.zone.desk.ui.screens.PassbookScreen
import com.zone.desk.ui.screens.PersonalScreen
import com.zone.desk.ui.screens.SettingsScreen
import com.zone.desk.ui.screens.SpendingScreen
import com.zone.desk.ui.screens.SplitDetailScreen
import com.zone.desk.ui.screens.SplitNewScreen
import com.zone.desk.ui.screens.SplitScreen
import com.zone.desk.ui.screens.SubscriptionCalendarScreen
import com.zone.desk.ui.screens.SubscriptionFormScreen
import com.zone.desk.ui.screens.SubscriptionsScreen
import com.zone.desk.ui.screens.TxnEditorScreen
import com.zone.desk.ui.screens.UnlockScreen
import com.zone.desk.ui.screens.VehicleScreen
import com.zone.desk.ui.screens.WatchDetailScreen
import com.zone.desk.ui.screens.WatchFormScreen
import com.zone.desk.ui.screens.WatchlistScreen
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.ui.theme.ZoneType

/**
 * Single nav graph for the whole desk. Root tabs live inside the same graph as
 * detail pages so deep links and system back behave exactly like the web app.
 */
@Composable
fun ZoneApp() {
    val vm: ZoneViewModel = viewModel()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val toast by vm.toast.collectAsStateWithLifecycle()
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val route = backStackEntry?.destination?.route
    val rootVisible = route?.let { it in Routes.rootRoutes } ?: true
    val snackbarHost = remember { SnackbarHostState() }

    ZoneTheme(theme = settings.theme) {
        LaunchedEffect(toast) {
            val message = toast ?: return@LaunchedEffect
            snackbarHost.showSnackbar(message)
            vm.clearToast()
        }

        Box(
            Modifier
                .fillMaxSize()
                .background(ZoneTheme.colors.paper)
        ) {
            ZoneNavHost(vm, navController)

            SnackbarHost(
                hostState = snackbarHost,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(
                        start = 18.dp,
                        end = 18.dp,
                        bottom = if (rootVisible) 78.dp else 16.dp
                    )
            ) { data ->
                Box(
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(ZoneTheme.colors.ink)
                        .padding(horizontal = 18.dp, vertical = 14.dp)
                ) {
                    Text(
                        text = data.visuals.message,
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.paper
                    )
                }
            }
        }
    }
}

@Composable
private fun ZoneNavHost(vm: ZoneViewModel, navController: NavHostController) {
    fun back() {
        if (!navController.popBackStack()) {
            navController.navigate(Routes.HOME) {
                launchSingleTop = true
            }
        }
    }

    val open: (String) -> Unit = { target ->
        if (target.isNotBlank()) navController.navigate(target)
    }

    val selectTab: (String) -> Unit = { target ->
        if (target != navController.currentDestination?.route) {
            navController.navigate(target) {
                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = Routes.HOME,
        modifier = Modifier.fillMaxSize()
    ) {
        /* -------------------------------------------------------------
           Root tabs
           ------------------------------------------------------------- */

        composable(Routes.HOME) {
            HomeScreen(vm, onSelectTab = selectTab, onOpen = open)
        }
        composable(Routes.PERSONAL) {
            PersonalScreen(vm, onSelectTab = selectTab, onOpen = open)
        }
        composable(Routes.MONEY) {
            MoneyHubScreen(vm, onSelectTab = selectTab, onOpen = open)
        }
        composable(Routes.LIBRARY) {
            LibraryScreen(vm, onSelectTab = selectTab, onOpen = open)
        }
        composable(Routes.SETTINGS) {
            SettingsScreen(
                vm,
                onSelectTab = selectTab,
                onOpenAdmin = { open(Routes.ADMIN) },
                onActivity = { open(Routes.ACTIVITY) }
            )
        }

        /* -------------------------------------------------------------
           Diary
           ------------------------------------------------------------- */

        composable(Routes.DIARY) {
            DiaryListScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.DIARY_NEW) },
                onRead = { open(Routes.diaryRead(it)) }
            )
        }
        composable(Routes.DIARY_NEW) {
            DiaryEditorScreen(vm, entryId = null, onBack = ::back)
        }
        composable(
            Routes.DIARY_EDIT,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { entry ->
            DiaryEditorScreen(vm, entryId = entry.arguments?.getString("id"), onBack = ::back)
        }
        composable(
            Routes.DIARY_READ,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { entry ->
            DiaryReaderScreen(
                vm,
                entryId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back,
                onEdit = { open(Routes.diaryEdit(it)) }
            )
        }

        /* -------------------------------------------------------------
           Lists
           ------------------------------------------------------------- */

        composable(Routes.LISTS) {
            ListsScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.LISTS_NEW) },
                onOpenList = { open(Routes.listDetail(it)) }
            )
        }
        composable(Routes.LISTS_NEW) {
            ListNewScreen(vm, onBack = ::back)
        }
        composable(
            Routes.LIST_DETAIL,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { entry ->
            ListDetailScreen(
                vm,
                listId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back
            )
        }

        /* -------------------------------------------------------------
           Habits
           ------------------------------------------------------------- */

        composable(Routes.HABITS) {
            HabitsScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.HABITS_NEW) },
                onOpenHabit = { open(Routes.habitDetail(it)) }
            )
        }
        composable(Routes.HABITS_NEW) {
            HabitNewScreen(vm, onBack = ::back)
        }
        composable(
            Routes.HABIT_DETAIL,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { entry ->
            HabitDetailScreen(
                vm,
                habitId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back
            )
        }

        /* -------------------------------------------------------------
           Notes
           ------------------------------------------------------------- */

        composable(Routes.NOTES) {
            NotesScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.NOTES_NEW) },
                onRead = { open(Routes.noteRead(it)) }
            )
        }
        composable(Routes.NOTES_NEW) {
            NoteEditorScreen(vm, noteId = null, onBack = ::back)
        }
        composable(
            Routes.NOTES_EDIT,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { entry ->
            NoteEditorScreen(vm, noteId = entry.arguments?.getString("id"), onBack = ::back)
        }
        composable(
            Routes.NOTE_READ,
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { entry ->
            NoteReaderScreen(
                vm,
                noteId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back,
                onEdit = { open(Routes.noteEdit(it)) }
            )
        }

        /* -------------------------------------------------------------
           Money: ledger, spending, passbook, split, mileage
           ------------------------------------------------------------- */

        composable(Routes.LEDGER) {
            LedgerScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.TXN_NEW) },
                onEdit = { open(Routes.txnEdit(it)) }
            )
        }
        composable(Routes.MONEY_SPENDING) {
            SpendingScreen(vm, onBack = ::back)
        }
        composable(Routes.TXN_NEW) {
            TxnEditorScreen(vm, txnId = null, onBack = ::back)
        }
        composable(
            Routes.TXN_EDIT,
            arguments = constListOfId()
        ) { entry ->
            TxnEditorScreen(
                vm,
                txnId = entry.arguments?.getString("id"),
                onBack = ::back
            )
        }

        composable(Routes.PASSBOOK) {
            PassbookScreen(
                vm,
                onBack = ::back,
                onAdd = { open(Routes.passbookAdd()) },
                onAccount = { open(Routes.accountStatement(it)) }
            )
        }
        composable(
            Routes.PASSBOOK_ADD,
            arguments = listOf(
                navArgument("account") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { entry ->
            PassbookAddScreen(
                vm,
                initialAccountId = entry.arguments?.getString("account")?.takeIf { it.isNotBlank() },
                onBack = ::back
            )
        }
        composable(
            Routes.ACCOUNT_STATEMENT,
            arguments = constListOfId()
        ) { entry ->
            AccountStatementScreen(
                vm,
                accountId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back,
                onAdd = { open(Routes.passbookAdd(entry.arguments?.getString("id"))) }
            )
        }

        composable(Routes.SPLIT) {
            SplitScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.SPLIT_NEW) },
                onGroup = { open(Routes.splitDetail(it)) }
            )
        }
        composable(Routes.SPLIT_NEW) {
            SplitNewScreen(vm, onBack = ::back)
        }
        composable(
            Routes.SPLIT_DETAIL,
            arguments = constListOfId()
        ) { entry ->
            SplitDetailScreen(
                vm,
                groupId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back
            )
        }

        composable(Routes.MILEAGE) {
            MileageScreen(
                vm,
                onBack = ::back,
                onLog = { vehicle -> open(Routes.mileageNew(vehicle)) },
                onVehicle = { open(Routes.vehicleDetail(it)) }
            )
        }
        composable(
            Routes.MILEAGE_NEW,
            arguments = listOf(
                navArgument("vehicle") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { entry ->
            MileageNewScreen(
                vm,
                initialVehicle = entry.arguments?.getString("vehicle")?.takeIf { it.isNotBlank() },
                onBack = ::back
            )
        }
        composable(
            Routes.VEHICLE,
            arguments = listOf(navArgument("name") { type = NavType.StringType })
        ) { entry ->
            val name = entry.arguments?.getString("name").orEmpty()
            VehicleScreen(
                vm,
                vehicleName = name,
                onBack = ::back,
                onLog = { open(Routes.mileageNew(name)) }
            )
        }

        /* -------------------------------------------------------------
           Library: watchlist, subscriptions, links
           ------------------------------------------------------------- */

        composable(Routes.WATCHLIST) {
            WatchlistScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.watchNew()) },
                onDetail = { open(Routes.watchDetail(it)) }
            )
        }
        composable(
            Routes.WATCH_NEW,
            arguments = listOf(
                navArgument("id") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { entry ->
            WatchFormScreen(
                vm,
                itemId = entry.arguments?.getString("id")?.takeIf { it.isNotBlank() },
                onBack = ::back
            )
        }
        composable(
            Routes.WATCH_DETAIL,
            arguments = constListOfId()
        ) { entry ->
            WatchDetailScreen(
                vm,
                itemId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back,
                onEdit = { open(Routes.watchNew(it)) }
            )
        }

        composable(Routes.SUBSCRIPTIONS) {
            SubscriptionsScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.subscriptionNew()) },
                onCalendar = { open(Routes.SUBSCRIPTION_CALENDAR) },
                onEdit = { open(Routes.subscriptionNew(it)) }
            )
        }
        composable(
            Routes.SUBSCRIPTION_NEW,
            arguments = listOf(
                navArgument("id") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { entry ->
            SubscriptionFormScreen(
                vm,
                subId = entry.arguments?.getString("id")?.takeIf { it.isNotBlank() },
                onBack = ::back
            )
        }
        composable(Routes.SUBSCRIPTION_CALENDAR) {
            SubscriptionCalendarScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.subscriptionNew()) }
            )
        }

        composable(Routes.LINKS) {
            LinksScreen(
                vm,
                onBack = ::back,
                onNew = { open(Routes.linkNew()) },
                onDetail = { open(Routes.linkDetail(it)) }
            )
        }
        composable(
            Routes.LINK_NEW,
            arguments = listOf(
                navArgument("id") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { entry ->
            LinkFormScreen(
                vm,
                linkId = entry.arguments?.getString("id")?.takeIf { it.isNotBlank() },
                onBack = ::back
            )
        }
        composable(
            Routes.LINK_DETAIL,
            arguments = constListOfId()
        ) { entry ->
            LinkDetailScreen(
                vm,
                linkId = entry.arguments?.getString("id").orEmpty(),
                onBack = ::back,
                onEdit = { open(Routes.linkNew(it)) }
            )
        }

        /* -------------------------------------------------------------
           Back office
           ------------------------------------------------------------- */

        composable(Routes.ADMIN) {
            AdminScreen(
                vm,
                onBack = ::back,
                onUnlock = { open(Routes.UNLOCK) },
                onActivity = { open(Routes.ACTIVITY) }
            )
        }
        composable(Routes.UNLOCK) {
            UnlockScreen(
                vm,
                onBack = ::back,
                onUnlocked = { navController.popBackStack() }
            )
        }
        composable(Routes.ACTIVITY) {
            ActivityScreen(
                vm,
                onBack = ::back,
                onUnlock = { open(Routes.UNLOCK) }
            )
        }
    }
}

private fun constListOfId() = listOf(navArgument("id") { type = NavType.StringType })
