package com.zone.desk.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException

val Context.zoneDataStore: DataStore<Preferences> by preferencesDataStore(name = "zone_prefs")

data class ZonePrefs(
    val apiBase: String = "",
    val adminToken: String = "",
    val adminExpiresAt: Long = 0L,
    val lastSync: Long = 0L,
    val firstRun: Boolean = true
) {
    val hasWorkspace: Boolean get() = apiBase.isNotBlank()
    val hasAdminSession: Boolean get() = adminToken.isNotBlank() && adminExpiresAt > System.currentTimeMillis()
}

class ZonePreferences(private val context: Context) {
    private object K {
        val API_BASE = stringPreferencesKey("api_base")
        val ADMIN_TOKEN = stringPreferencesKey("admin_token")
        val ADMIN_EXPIRES = longPreferencesKey("admin_expires")
        val LAST_SYNC = longPreferencesKey("last_sync")
        val FIRST_RUN = booleanPreferencesKey("first_run")
    }

    val data: Flow<ZonePrefs> = context.zoneDataStore.data
        .catch { error ->
            if (error is IOException) emit(emptyPreferences()) else throw error
        }
        .map { prefs ->
            ZonePrefs(
                apiBase = prefs[K.API_BASE].orEmpty(),
                adminToken = prefs[K.ADMIN_TOKEN].orEmpty(),
                adminExpiresAt = prefs[K.ADMIN_EXPIRES] ?: 0L,
                lastSync = prefs[K.LAST_SYNC] ?: 0L,
                firstRun = prefs[K.FIRST_RUN] ?: true
            )
        }

    suspend fun setApiBase(raw: String) {
        context.zoneDataStore.edit { prefs ->
            prefs[K.API_BASE] = normalizeApiBase(raw)
            prefs[K.FIRST_RUN] = false
        }
    }

    suspend fun setAdminSession(token: String, expiresAt: Long) {
        context.zoneDataStore.edit { prefs ->
            prefs[K.ADMIN_TOKEN] = token
            prefs[K.ADMIN_EXPIRES] = expiresAt
        }
    }

    suspend fun clearAdminSession() {
        context.zoneDataStore.edit { prefs ->
            prefs[K.ADMIN_TOKEN] = ""
            prefs[K.ADMIN_EXPIRES] = 0L
        }
    }

    suspend fun setLastSync(at: Long) {
        context.zoneDataStore.edit { prefs -> prefs[K.LAST_SYNC] = at }
    }

    suspend fun markFirstRunDone() {
        context.zoneDataStore.edit { prefs -> prefs[K.FIRST_RUN] = false }
    }

    companion object {
        fun normalizeApiBase(raw: String): String {
            var text = raw.trim()
            if (text.isEmpty()) return ""
            if (!text.startsWith("http://", ignoreCase = true) && !text.startsWith("https://", ignoreCase = true)) {
                text = "https://$text"
            }
            text = text.trimEnd('/')
            if (!text.endsWith("/api", ignoreCase = true) && !text.contains("/api/", ignoreCase = true)) {
                text += "/api"
            }
            return text
        }
    }
}
