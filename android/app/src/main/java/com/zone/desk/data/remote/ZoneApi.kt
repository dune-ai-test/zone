package com.zone.desk.data.remote

import com.zone.desk.data.model.ApiErrorResponse
import com.zone.desk.data.model.AuditRequest
import com.zone.desk.data.model.BootstrapResponse
import com.zone.desk.data.model.DataItem
import com.zone.desk.data.model.DataRequest
import com.zone.desk.data.model.HealthResponse
import com.zone.desk.data.model.LoginResponse
import com.zone.desk.data.model.SessionResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class ApiException(
    val status: Int,
    override val message: String
) : Exception(message)

class ZoneApi(private val json: Json) {
    private val mediaType = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private fun url(base: String, path: String): String = base.trimEnd('/') + path

    private fun builder(base: String, path: String, token: String?): Request.Builder {
        val request = Request.Builder()
            .url(url(base, path))
            .header("Accept", "application/json")
            .header("Cache-Control", "no-store")
        if (!token.isNullOrBlank()) request.header("Authorization", "Bearer $token")
        return request
    }

    private suspend fun execute(builder: Request.Builder): String = withContext(Dispatchers.IO) {
        client.newCall(builder.build()).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val message = runCatching {
                    json.decodeFromString(ApiErrorResponse.serializer(), text).error
                }.getOrNull().orEmpty().ifBlank { "Workspace request failed (${response.code})." }
                throw ApiException(response.code, message)
            }
            text
        }
    }

    private fun body(element: JsonObject) = element.toString().toRequestBody(mediaType)

    suspend fun health(base: String): HealthResponse {
        val text = execute(builder(base, "/health", null).get())
        return json.decodeFromString(HealthResponse.serializer(), text)
    }

    suspend fun bootstrap(base: String): BootstrapResponse {
        val path = "/bootstrap?t=${System.currentTimeMillis()}"
        val text = execute(builder(base, path, null).get())
        return json.decodeFromString(BootstrapResponse.serializer(), text)
    }

    suspend fun putData(base: String, items: List<DataItem>, token: String? = null) {
        val payload = json.encodeToString(DataRequest.serializer(), DataRequest(items))
        execute(
            builder(base, "/data", token)
                .put(payload.toRequestBody(mediaType))
        )
    }

    suspend fun postAudit(
        base: String,
        events: List<com.zone.desk.data.model.AuditEvent>,
        deleted: List<String>,
        token: String? = null
    ) {
        val payload = json.encodeToString(AuditRequest.serializer(), AuditRequest(events, deleted))
        execute(
            builder(base, "/audit", token)
                .post(payload.toRequestBody(mediaType))
        )
    }

    suspend fun login(base: String, password: String): LoginResponse {
        val payload = buildJsonObject { put("password", password) }
        return try {
            val text = execute(builder(base, "/admin/login", null).post(body(payload)))
            json.decodeFromString(LoginResponse.serializer(), text)
        } catch (error: ApiException) {
            LoginResponse(ok = false, error = error.message)
        }
    }

    suspend fun verifySession(base: String, token: String): SessionResponse =
        try {
            val text = execute(builder(base, "/admin/session", token).get())
            json.decodeFromString(SessionResponse.serializer(), text)
        } catch (_: ApiException) {
            SessionResponse(ok = false)
        }
}
