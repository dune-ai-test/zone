package com.zone.desk.data.local

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "workspace_records")
data class WorkspaceRecordEntity(
    @PrimaryKey val key: String,
    val json: String,
    val updatedAt: Long,
    val dirty: Boolean
)

@Entity(tableName = "audit_events")
data class AuditEventEntity(
    @PrimaryKey val id: String,
    val json: String,
    val at: String,
    val status: String,
    val dirty: Boolean
)

@Entity(tableName = "audit_deletions")
data class AuditDeletionEntity(
    @PrimaryKey val id: String,
    val queuedAt: Long
)

@Dao
interface WorkspaceDao {
    @Query("SELECT * FROM workspace_records ORDER BY key")
    fun observeAll(): Flow<List<WorkspaceRecordEntity>>

    @Query("SELECT * FROM workspace_records WHERE key = :key LIMIT 1")
    suspend fun find(key: String): WorkspaceRecordEntity?

    @Query("SELECT * FROM workspace_records WHERE dirty = 1 ORDER BY updatedAt")
    suspend fun dirty(): List<WorkspaceRecordEntity>

    @Query("SELECT key FROM workspace_records WHERE dirty = 0")
    suspend fun cleanKeys(): List<String>

    @Upsert
    suspend fun upsert(record: WorkspaceRecordEntity)

    @Query("UPDATE workspace_records SET dirty = 0 WHERE key = :key AND json = :json")
    suspend fun markClean(key: String, json: String)

    @Query("DELETE FROM workspace_records WHERE key = :key AND dirty = 0")
    suspend fun deleteIfClean(key: String)

    @Query("DELETE FROM workspace_records WHERE key = :key")
    suspend fun delete(key: String)

    @Query("DELETE FROM workspace_records")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM workspace_records")
    suspend fun count(): Int

    @Query("SELECT COALESCE(SUM(LENGTH(json)), 0) FROM workspace_records")
    suspend fun byteSize(): Long
}

@Dao
interface AuditDao {
    @Query("SELECT * FROM audit_events ORDER BY at DESC")
    fun observeAll(): Flow<List<AuditEventEntity>>

    @Query("SELECT * FROM audit_events ORDER BY at DESC")
    suspend fun all(): List<AuditEventEntity>

    @Query("SELECT * FROM audit_events WHERE dirty = 1 ORDER BY at")
    suspend fun dirty(): List<AuditEventEntity>

    @Query("SELECT * FROM audit_events WHERE status != 'pending' ORDER BY at DESC")
    suspend fun resolved(): List<AuditEventEntity>

    @Upsert
    suspend fun upsert(event: AuditEventEntity)

    @Query("UPDATE audit_events SET dirty = 0 WHERE id = :id AND json = :json")
    suspend fun markClean(id: String, json: String)

    @Query("DELETE FROM audit_events WHERE id = :id AND dirty = 0")
    suspend fun deleteIfClean(id: String)

    @Query("DELETE FROM audit_events WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<String>)

    @Query("UPDATE audit_events SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: String, status: String)

    @Query("DELETE FROM audit_events")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM audit_events")
    suspend fun count(): Int
}

@Dao
interface AuditDeletionDao {
    @Query("SELECT * FROM audit_deletions ORDER BY queuedAt")
    suspend fun all(): List<AuditDeletionEntity>

    @Upsert
    suspend fun enqueue(item: AuditDeletionEntity)

    @Query("DELETE FROM audit_deletions WHERE id IN (:ids)")
    suspend fun remove(ids: List<String>)

    @Query("DELETE FROM audit_deletions")
    suspend fun clear()
}

@Database(
    entities = [
        WorkspaceRecordEntity::class,
        AuditEventEntity::class,
        AuditDeletionEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class ZoneDatabase : RoomDatabase() {
    abstract fun workspaceDao(): WorkspaceDao
    abstract fun auditDao(): AuditDao
    abstract fun auditDeletionDao(): AuditDeletionDao

    companion object {
        fun build(context: Context): ZoneDatabase =
            Room.databaseBuilder(context, ZoneDatabase::class.java, "zone-cache.db")
                .fallbackToDestructiveMigration()
                .build()
    }
}
