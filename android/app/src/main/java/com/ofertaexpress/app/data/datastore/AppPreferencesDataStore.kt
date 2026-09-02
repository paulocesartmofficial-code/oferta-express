package com.ofertaexpress.app.data.datastore

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "oferta_express_prefs")

class AppPreferencesDataStore(private val context: Context) {

    companion object {
        val KEY_BACKEND_URL = stringPreferencesKey("backend_url")
        val KEY_DEFAULT_STYLE = stringPreferencesKey("default_style")
        val KEY_DEFAULT_EMOJIS = stringPreferencesKey("default_emojis")
        val KEY_CUSTOM_SIGNATURE = stringPreferencesKey("custom_signature")
        val KEY_AUTO_COPY = booleanPreferencesKey("auto_copy")

        const val DEFAULT_LOCAL_BACKEND = "http://10.0.2.2:3000"
    }

    val backendUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_BACKEND_URL] ?: DEFAULT_LOCAL_BACKEND
    }

    val defaultStyle: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_DEFAULT_STYLE] ?: "chamativo"
    }

    val defaultEmojis: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_DEFAULT_EMOJIS] ?: "normal"
    }

    val customSignature: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_CUSTOM_SIGNATURE] ?: ""
    }

    val autoCopy: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[KEY_AUTO_COPY] ?: false
    }

    suspend fun saveBackendUrl(url: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_BACKEND_URL] = url.trim()
        }
    }

    suspend fun savePreferences(style: String, emojis: String, signature: String, autoCopy: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[KEY_DEFAULT_STYLE] = style
            prefs[KEY_DEFAULT_EMOJIS] = emojis
            prefs[KEY_CUSTOM_SIGNATURE] = signature
            prefs[KEY_AUTO_COPY] = autoCopy
        }
    }
}
