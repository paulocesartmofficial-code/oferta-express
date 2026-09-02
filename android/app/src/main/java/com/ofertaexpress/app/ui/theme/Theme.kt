package com.ofertaexpress.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = BrandOrange,
    onPrimary = TextWhite,
    primaryContainer = BrandOrangeBg,
    onPrimaryContainer = BrandOrangeLight,
    secondary = BrandGreen,
    onSecondary = TextWhite,
    background = BrandDarkBg,
    onBackground = TextWhite,
    surface = BrandCardBg,
    onSurface = TextWhite,
    surfaceVariant = BrandCardSubBg,
    onSurfaceVariant = TextMuted,
    outline = BrandCardBorder,
    error = BrandRed,
    onError = TextWhite
)

@Composable
fun OfertaExpressTheme(
    content: @Composable () -> Unit
) {
    // ALWAYS Dark Theme - Light mode is permanently disabled
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
