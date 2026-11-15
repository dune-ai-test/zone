package com.zone.desk.util

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.time.temporal.TemporalAdjusters
import java.time.temporal.WeekFields
import java.util.Locale

object ZoneDates {
    private val locale = Locale.ENGLISH
    private val iso: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    private val longDateFormatter = DateTimeFormatter.ofPattern("d MMMM", locale)
    private val shortDateFormatter = DateTimeFormatter.ofPattern("d MMM", locale)
    private val stampFormatter = DateTimeFormatter.ofPattern("EEE d MMM", locale)

    fun today(): String = LocalDate.now().toString()

    fun nowIso(): String = Instant.now().toString()

    fun parse(value: String?): LocalDate? =
        try {
            if (value.isNullOrBlank()) null else LocalDate.parse(value.take(10), iso)
        } catch (_: Exception) {
            null
        }

    fun valid(value: String?): String? = parse(value)?.toString()

    fun monthKey(value: String?): String = value.orEmpty().take(7)

    fun currentMonth(): String = today().take(7)

    fun monthLabel(key: String, long: Boolean = true): String {
        val date = parse("$key-01") ?: return key
        return if (long) {
            date.format(DateTimeFormatter.ofPattern("MMMM yyyy", locale))
        } else {
            date.format(DateTimeFormatter.ofPattern("MMM", locale))
        }
    }

    fun monthShort(key: String): String =
        parse("$key-01")?.format(DateTimeFormatter.ofPattern("MMM", locale)) ?: key

    fun daysInMonth(key: String): Int =
        parse("$key-01")?.lengthOfMonth() ?: 30

    fun firstDayOffset(key: String): Int {
        val date = parse("$key-01") ?: return 0
        return (date.dayOfWeek.value + 6) % 7
    }

    fun monthDates(key: String): List<LocalDate> {
        val first = parse("$key-01") ?: return emptyList()
        return (1..first.lengthOfMonth()).map { first.withDayOfMonth(it) }
    }

    fun addDays(value: String, days: Long): String {
        val date = parse(value) ?: LocalDate.now()
        return date.plusDays(days).toString()
    }

    fun weekStart(offsetWeeks: Int = 0): LocalDate =
        LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusWeeks(offsetWeeks.toLong())

    fun weekDates(offsetWeeks: Int = 0): List<String> {
        val start = weekStart(offsetWeeks)
        return (0L..6L).map { start.plusDays(it).toString() }
    }

    fun weekNumber(date: LocalDate = LocalDate.now()): Int =
        date.get(WeekFields.ISO.weekOfWeekBasedYear())

    fun weekLabel(offsetWeeks: Int = 0): String = "W${weekNumber(weekStart(offsetWeeks))}"

    fun identifier(date: LocalDate = LocalDate.now()): String =
        "${date.year}-${date.monthValue.toString().padStart(2, '0')}-${date.dayOfMonth.toString().padStart(2, '0')}"

    fun prettyDate(value: String?): String {
        val date = parse(value) ?: return value.orEmpty()
        return date.format(stampFormatter).uppercase(locale)
    }

    fun longDate(value: String?): String {
        val date = parse(value) ?: return value.orEmpty()
        return "${date.dayOfWeek.getDisplayName(TextStyle.FULL, locale)}, ${date.format(longDateFormatter)}"
    }

    fun shortDate(value: String?): String {
        val date = parse(value) ?: return value.orEmpty()
        return date.format(shortDateFormatter)
    }

    fun weekdayShort(value: String?): String {
        val date = parse(value) ?: return ""
        return date.dayOfWeek.getDisplayName(TextStyle.SHORT, locale).uppercase(locale)
    }

    fun weekdayLetter(index: Int): String = listOf("M", "T", "W", "T", "F", "S", "S")[index % 7]

    fun weekdayLong(value: String?): String {
        val date = parse(value) ?: return ""
        return date.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
    }

    fun relative(value: String?, today: LocalDate = LocalDate.now()): String {
        val date = parse(value) ?: return ""
        val days = java.time.temporal.ChronoUnit.DAYS.between(today, date)
        return when {
            days == 0L -> "today"
            days == 1L -> "tomorrow"
            days == -1L -> "yesterday"
            days > 1L -> "in $days days"
            else -> "${-days} days ago"
        }
    }

    fun relativeShort(value: String?): String {
        val date = parse(value) ?: return ""
        val days = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), date)
        return when {
            days == 0L -> "today"
            days > 0L -> "in ${days}d"
            else -> "${-days}d ago"
        }
    }

    fun daysUntil(value: String?): Long? {
        val date = parse(value) ?: return null
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), date)
    }

    fun startOfDayMillis(value: String?): Long? =
        parse(value)?.atStartOfDay()?.toInstant(ZoneOffset.UTC)?.toEpochMilli()

    fun fromMillisUtc(millis: Long?): String? {
        if (millis == null) return null
        return LocalDateTime.ofInstant(Instant.ofEpochMilli(millis), ZoneOffset.UTC).toLocalDate().toString()
    }

    fun greeting(): String {
        val hour = java.time.LocalTime.now().hour
        return when {
            hour < 5 -> "Good night."
            hour < 12 -> "Good morning."
            hour < 17 -> "Good afternoon."
            else -> "Good evening."
        }
    }

    fun dateStamp(): String = "${weekdayShort(today())} ${shortDate(today()).uppercase(locale)} \u00B7 WEEK ${weekNumber()}"

    fun todayLong(): String = longDate(today())
}
