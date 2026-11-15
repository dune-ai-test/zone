package com.zone.desk.util

import java.security.SecureRandom

object ZoneIds {
    private val random = SecureRandom()

    fun uid(prefix: String = "id"): String {
        val time = System.currentTimeMillis().toString(36)
        val noise = (random.nextInt(60466176)).toString(36).padStart(5, '0').take(5)
        return "$prefix-$time-$noise"
    }
}
