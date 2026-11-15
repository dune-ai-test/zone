package com.zone.desk.util

import java.net.URI
import java.text.NumberFormat
import java.util.Locale

data class CurrencyInfo(
    val code: String,
    val symbol: String,
    val label: String,
    val locale: Locale
)

object ZoneMoney {
    val currencies = listOf(
        CurrencyInfo("INR", "\u20B9", "Indian rupee", Locale.forLanguageTag("en-IN")),
        CurrencyInfo("USD", "$", "US dollar", Locale.US),
        CurrencyInfo("EUR", "\u20AC", "Euro", Locale.GERMANY),
        CurrencyInfo("GBP", "\u00A3", "Pound sterling", Locale.UK),
        CurrencyInfo("AED", "\u062F.\u0625", "UAE dirham", Locale.US),
        CurrencyInfo("AUD", "A$", "Australian dollar", Locale.US),
        CurrencyInfo("CAD", "C$", "Canadian dollar", Locale.US),
        CurrencyInfo("SGD", "S$", "Singapore dollar", Locale.US)
    )

    fun info(code: String?): CurrencyInfo =
        currencies.firstOrNull { it.code.equals(code, ignoreCase = true) } ?: currencies.first()

    fun symbol(code: String?): String = info(code).symbol

    fun money(amount: Double, code: String?, decimals: Int? = null, grouped: Boolean = true): String {
        val meta = info(code)
        val value = if (amount.isNaN() || amount.isInfinite()) 0.0 else amount
        val digits = decimals ?: if (kotlin.math.abs(value - value.toLong()) < 0.005) 0 else 2
        val formatter = NumberFormat.getNumberInstance(if (grouped) meta.locale else Locale.US)
        formatter.minimumFractionDigits = digits
        formatter.maximumFractionDigits = digits
        formatter.isGroupingUsed = grouped
        val text = formatter.format(kotlin.math.abs(value))
        val sign = if (value < -0.004) "-" else ""
        return "$sign${meta.symbol}$text"
    }

    fun signed(amount: Double, code: String?): String {
        val sign = when {
            amount > 0.004 -> "+"
            amount < -0.004 -> "-"
            else -> ""
        }
        return "$sign${money(kotlin.math.abs(amount), code)}"
    }

    fun compact(amount: Double, code: String?): String {
        val meta = info(code)
        val value = kotlin.math.abs(amount)
        val sign = if (amount < 0) "-" else ""
        if (meta.code == "INR") {
            return when {
                value >= 10_000_000 -> "$sign${meta.symbol}${trim(value / 10_000_000)}Cr"
                value >= 100_000 -> "$sign${meta.symbol}${trim(value / 100_000)}L"
                value >= 1_000 -> "$sign${meta.symbol}${trim(value / 1_000)}k"
                else -> money(amount, code)
            }
        }
        return when {
            value >= 1_000_000 -> "$sign${meta.symbol}${trim(value / 1_000_000)}M"
            value >= 1_000 -> "$sign${meta.symbol}${trim(value / 1_000)}k"
            else -> money(amount, code)
        }
    }

    private fun trim(value: Double): String {
        val text = if (value >= 100) String.format(Locale.US, "%.0f", value)
        else if (value >= 10) String.format(Locale.US, "%.1f", value)
        else String.format(Locale.US, "%.2f", value)
        return text.trimEnd('0').trimEnd('.')
    }

    fun pct(part: Double, whole: Double): Int =
        if (whole <= 0.0) 0 else kotlin.math.round((part / whole) * 100).toInt()

    fun normalizeUrl(raw: String): String? {
        var text = raw.trim()
        if (text.isEmpty()) return null
        if (!Regex("^[a-zA-Z][a-zA-Z0-9+.-]*:").containsMatchIn(text)) text = "https://$text"
        return try {
            val uri = URI(text)
            if (uri.scheme != "http" && uri.scheme != "https") null else uri.toString()
        } catch (_: Exception) {
            null
        }
    }

    fun domainOf(url: String?): String {
        val clean = normalizeUrl(url.orEmpty()) ?: return url.orEmpty().removePrefix("https://").removePrefix("http://").substringBefore("/")
        return try {
            URI(clean).host?.removePrefix("www.") ?: clean
        } catch (_: Exception) {
            clean
        }
    }

    fun initials(name: String?): String {
        val words = name.orEmpty().trim().split(Regex("\\s+")).filter { it.isNotBlank() }
        if (words.isEmpty()) return "?"
        if (words.size == 1) return words.first().take(1).uppercase()
        return (words.first().take(1) + words.last().take(1)).uppercase()
    }

    fun toneFor(name: String?): Int {
        var sum = 0
        name.orEmpty().forEach { sum = (sum * 31 + it.code) % 100000 }
        return sum % 6
    }

    fun plural(count: Int, one: String, many: String = "${one}s"): String =
        "$count ${if (count == 1) one else many}"

    fun words(text: String?): Int = text.orEmpty().trim().let { if (it.isEmpty()) 0 else it.split(Regex("\\s+")).size }

    fun readingMinutes(text: String?): Int {
        val count = words(text)
        return if (count == 0) 0 else kotlin.math.max(1, kotlin.math.ceil(count / 200.0).toInt())
    }

    fun csvCell(value: String?): String {
        val text = value.orEmpty()
        return if (text.contains(',') || text.contains('"') || text.contains('\n')) {
            "\"" + text.replace("\"", "\"\"") + "\""
        } else text
    }

    fun csv(rows: List<List<String>>): String =
        rows.joinToString("\n") { row -> row.joinToString(",") { csvCell(it) } }
}
