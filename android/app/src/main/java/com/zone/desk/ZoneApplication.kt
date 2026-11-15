package com.zone.desk

import android.app.Application
import android.content.Context
import androidx.work.WorkManager
import com.zone.desk.data.local.ZoneDatabase
import com.zone.desk.data.prefs.ZonePreferences
import com.zone.desk.data.remote.ZoneApi
import com.zone.desk.data.repo.WorkspaceRepository
import com.zone.desk.data.sync.SyncScheduler
import com.zone.desk.data.sync.ZoneSync
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.serialization.json.Json

class AppContainer(private val context: Context) {
    val json: Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = false
        isLenient = true
    }

    val database: ZoneDatabase = ZoneDatabase.build(context)
    val prefs = ZonePreferences(context)
    val api = ZoneApi(json)
    val repository = WorkspaceRepository(database, json)
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val sync = ZoneSync(api, prefs, repository, scope, json)

    fun start() {
        sync.start()
        SyncScheduler.schedulePeriodic(context)
    }
}

class ZoneApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        container.start()
    }
}
