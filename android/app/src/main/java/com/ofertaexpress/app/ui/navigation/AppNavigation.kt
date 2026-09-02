package com.ofertaexpress.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ofertaexpress.app.ui.components.BottomNavBar
import com.ofertaexpress.app.ui.components.Screen
import com.ofertaexpress.app.ui.components.TopAppHeader
import com.ofertaexpress.app.ui.screens.*
import com.ofertaexpress.app.ui.theme.BrandDarkBg
import com.ofertaexpress.app.ui.viewmodels.*

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    sharedUrl: String? = null
) {
    val homeViewModel: HomeViewModel = viewModel()
    val historyViewModel: HistoryViewModel = viewModel()
    val favoritesViewModel: FavoritesViewModel = viewModel()
    val settingsViewModel: SettingsViewModel = viewModel()

    androidx.compose.runtime.LaunchedEffect(sharedUrl) {
        if (!sharedUrl.isNullOrBlank()) {
            homeViewModel.setInputUrl(sharedUrl)
        }
    }

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Home.route

    val isOnline by homeViewModel.isOnline.collectAsState()
    val affiliateConfigured by homeViewModel.affiliateConfigured.collectAsState()
    val geminiReady by homeViewModel.geminiReady.collectAsState()

    Scaffold(
        containerColor = BrandDarkBg,
        topBar = {
            TopAppHeader(
                isOnline = isOnline,
                affiliateConfigured = affiliateConfigured,
                geminiReady = geminiReady
            )
        },
        bottomBar = {
            BottomNavBar(
                currentRoute = currentRoute,
                onNavigate = { route ->
                    navController.navigate(route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    viewModel = homeViewModel,
                    onNavigateToBatch = { navController.navigate("batch") },
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) }
                )
            }

            composable("batch") {
                BatchOffersScreen(
                    onBack = { navController.popBackStack() },
                    onProcessBatch = { urls ->
                        if (urls.isNotEmpty()) {
                            homeViewModel.setInputUrl(urls.first())
                            navController.popBackStack()
                            homeViewModel.generateOffer(urls.first())
                        }
                    }
                )
            }

            composable(Screen.History.route) {
                HistoryScreen(
                    viewModel = historyViewModel,
                    onRegenerate = { url ->
                        homeViewModel.setInputUrl(url)
                        navController.navigate(Screen.Home.route)
                        homeViewModel.generateOffer(url)
                    }
                )
            }

            composable(Screen.Favorites.route) {
                FavoritesScreen(
                    viewModel = favoritesViewModel,
                    onRegenerate = { url ->
                        homeViewModel.setInputUrl(url)
                        navController.navigate(Screen.Home.route)
                        homeViewModel.generateOffer(url)
                    }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(viewModel = settingsViewModel)
            }
        }
    }
}
