package com.zone.desk.ui.theme

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

/* =========================================================================
   Zone's warm-paper palette. Every screen reads these through ZoneTheme.colors.
   ========================================================================= */

val ZonePaper = Color(0xFFF3F0E8)
val ZonePaperRaised = Color(0xFFFAF8F2)
val ZonePaperDeep = Color(0xFFE9E4D8)
val ZoneInk = Color(0xFF141310)
val ZoneInkSoft = Color(0xFF4B473C)
val ZoneInkMuted = Color(0xFF8B8575)
val ZoneLine = Color(0xFFD8D2C4)
val ZoneAccent = Color(0xFFD8431C)
val ZoneAccentSoft = Color(0xFFF8DFD6)
val ZoneSage = Color(0xFF5E6F58)
val ZoneSand = Color(0xFFC5A267)
val ZoneClay = Color(0xFFB4553D)

val ZoneNight = Color(0xFF141310)
val ZoneNightRaised = Color(0xFF1E1C18)
val ZoneNightDeep = Color(0xFF0E0D0B)
val ZoneNightLine = Color(0xFF38342C)
val ZoneNightInk = Color(0xFFF0ECE1)
val ZoneNightSoft = Color(0xFFBDB6A6)
val ZoneNightMuted = Color(0xFF888173)
val ZoneNightAccent = Color(0xFFF06A42)
val ZoneNightAccentSoft = Color(0xFF3B2118)

@Immutable
data class ZoneColors(
    val paper: Color,
    val raised: Color,
    val deep: Color,
    val ink: Color,
    val inkSoft: Color,
    val muted: Color,
    val line: Color,
    val accent: Color,
    val accentSoft: Color,
    val sage: Color,
    val sand: Color,
    val clay: Color,
    val isDark: Boolean
) {
    val success: Color get() = sage
    val warning: Color get() = sand
    val danger: Color get() = accent
}

private val LightPalette = ZoneColors(
    paper = ZonePaper,
    raised = ZonePaperRaised,
    deep = ZonePaperDeep,
    ink = ZoneInk,
    inkSoft = ZoneInkSoft,
    muted = ZoneInkMuted,
    line = ZoneLine,
    accent = ZoneAccent,
    accentSoft = ZoneAccentSoft,
    sage = ZoneSage,
    sand = ZoneSand,
    clay = ZoneClay,
    isDark = false
)

private val DarkPalette = ZoneColors(
    paper = ZoneNight,
    raised = ZoneNightRaised,
    deep = ZoneNightDeep,
    ink = ZoneNightInk,
    inkSoft = ZoneNightSoft,
    muted = ZoneNightMuted,
    line = ZoneNightLine,
    accent = ZoneNightAccent,
    accentSoft = ZoneNightAccentSoft,
    sage = Color(0xFF93A48C),
    sand = Color(0xFFD4B47A),
    clay = Color(0xFFD07A60),
    isDark = true
)

private val LocalZoneColors = staticCompositionLocalOf { LightPalette }

/* =========================================================================
   Type — platform serif for display, sans for prose, mono for system labels.
   ========================================================================= */

val ZoneSerif = FontFamily.Serif
val ZoneSans = FontFamily.SansSerif
val ZoneMono = FontFamily.Monospace

object ZoneType {
    val display = TextStyle(
        fontFamily = ZoneSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 40.sp,
        lineHeight = 42.sp,
        letterSpacing = (-1.1).sp
    )
    val displaySmall = TextStyle(
        fontFamily = ZoneSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 30.sp,
        lineHeight = 33.sp,
        letterSpacing = (-0.6).sp
    )
    val headline = TextStyle(
        fontFamily = ZoneSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 23.sp,
        lineHeight = 27.sp,
        letterSpacing = (-0.25).sp
    )
    val serifBody = TextStyle(
        fontFamily = ZoneSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 17.sp,
        lineHeight = 27.sp
    )
    val body = TextStyle(
        fontFamily = ZoneSans,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 21.sp
    )
    val bodySmall = TextStyle(
        fontFamily = ZoneSans,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 18.sp
    )
    val mono = TextStyle(
        fontFamily = ZoneMono,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        lineHeight = 15.sp,
        letterSpacing = 1.1.sp
    )
    val monoSmall = TextStyle(
        fontFamily = ZoneMono,
        fontWeight = FontWeight.Normal,
        fontSize = 9.sp,
        lineHeight = 13.sp,
        letterSpacing = 1.0.sp
    )
    val monoBig = TextStyle(
        fontFamily = ZoneMono,
        fontWeight = FontWeight.Medium,
        fontSize = 18.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.4).sp
    )
    val number = TextStyle(
        fontFamily = ZoneSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 30.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.6).sp
    )
    val numberBig = TextStyle(
        fontFamily = ZoneSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 46.sp,
        lineHeight = 46.sp,
        letterSpacing = (-1.4).sp
    )
}

private val ZoneTypography = Typography(
    displayLarge = ZoneType.display,
    displayMedium = ZoneType.displaySmall,
    displaySmall = ZoneType.number,
    headlineLarge = ZoneType.displaySmall,
    headlineMedium = ZoneType.headline,
    headlineSmall = ZoneType.headline.copy(fontSize = 20.sp, lineHeight = 24.sp),
    titleLarge = ZoneType.headline,
    titleMedium = TextStyle(
        fontFamily = ZoneSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp,
        lineHeight = 23.sp
    ),
    titleSmall = TextStyle(
        fontFamily = ZoneSans,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 19.sp
    ),
    bodyLarge = ZoneType.body.copy(fontSize = 15.sp, lineHeight = 23.sp),
    bodyMedium = ZoneType.body,
    bodySmall = ZoneType.bodySmall,
    labelLarge = TextStyle(
        fontFamily = ZoneMono,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        letterSpacing = 1.1.sp
    ),
    labelMedium = ZoneType.mono,
    labelSmall = ZoneType.monoSmall
)

private val ZoneShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(2.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(6.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(28.dp)
)

private fun Context.findActivity(): Activity? {
    var current: Context? = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    return current as? Activity
}

object ZoneTheme {
    val colors: ZoneColors
        @Composable
        @ReadOnlyComposable
        get() = LocalZoneColors.current

    @Composable
    operator fun invoke(
        theme: String = "system",
        content: @Composable () -> Unit
    ) {
        val systemDark = isSystemInDarkTheme()
        val dark = when (theme) {
            "dark" -> true
            "light" -> false
            else -> systemDark
        }
        val colors = if (dark) DarkPalette else LightPalette
        val scheme = if (dark) {
            darkColorScheme(
                primary = colors.accent,
                onPrimary = Color.White,
                primaryContainer = colors.accentSoft,
                onPrimaryContainer = colors.ink,
                secondary = colors.sage,
                onSecondary = Color.White,
                background = colors.paper,
                onBackground = colors.ink,
                surface = colors.raised,
                onSurface = colors.ink,
                surfaceVariant = colors.deep,
                onSurfaceVariant = colors.inkSoft,
                outline = colors.line,
                error = colors.accent
            )
        } else {
            lightColorScheme(
                primary = colors.accent,
                onPrimary = Color.White,
                primaryContainer = colors.accentSoft,
                onPrimaryContainer = colors.ink,
                secondary = colors.sage,
                onSecondary = Color.White,
                background = colors.paper,
                onBackground = colors.ink,
                surface = colors.raised,
                onSurface = colors.ink,
                surfaceVariant = colors.deep,
                onSurfaceVariant = colors.inkSoft,
                outline = colors.line,
                error = colors.accent
            )
        }

        val view = LocalView.current
        if (!view.isInEditMode) {
            SideEffect {
                val activity = view.context.findActivity() ?: return@SideEffect
                val window = activity.window
                WindowCompat.getInsetsController(window, view).apply {
                    isAppearanceLightStatusBars = !dark
                    isAppearanceLightNavigationBars = !dark
                }
            }
        }

        CompositionLocalProvider(LocalZoneColors provides colors) {
            MaterialTheme(
                colorScheme = scheme,
                typography = ZoneTypography,
                shapes = ZoneShapes,
                content = content
            )
        }
    }
}
