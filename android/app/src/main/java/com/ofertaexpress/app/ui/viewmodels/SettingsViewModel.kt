package com.ofertaexpress.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ofertaexpress.app.data.datastore.AppPreferencesDataStore
import com.ofertaexpress.app.data.models.AppSettings
import com.ofertaexpress.app.data.repository.OfertaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class ConnectionStatus {
    object Idle : ConnectionStatus()
    object Testing : ConnectionStatus()
    data class Connected(val message: String) : ConnectionStatus()
    data class Error(val message: String) : ConnectionStatus()
}

class SettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val dataStore = AppPreferencesDataStore(application)
    private var repository = OfertaRepository(AppPreferencesDataStore.DEFAULT_LOCAL_BACKEND)

    private val _backendUrl = MutableStateFlow(AppPreferencesDataStore.DEFAULT_LOCAL_BACKEND)
    val backendUrl: StateFlow<String> = _backendUrl.asStateFlow()

    private val _connectionStatus = MutableStateFlow<ConnectionStatus>(ConnectionStatus.Idle)
    val connectionStatus: StateFlow<ConnectionStatus> = _connectionStatus.asStateFlow()

    private val _appSettings = MutableStateFlow<AppSettings?>(null)
    val appSettings: StateFlow<AppSettings?> = _appSettings.asStateFlow()

    private val _selectedStyle = MutableStateFlow("chamativo")
    val selectedStyle: StateFlow<String> = _selectedStyle.asStateFlow()

    private val _selectedEmojis = MutableStateFlow("normal")
    val selectedEmojis: StateFlow<String> = _selectedEmojis.asStateFlow()

    private val _customSignature = MutableStateFlow("")
    val customSignature: StateFlow<String> = _customSignature.asStateFlow()

    private val _autoCopy = MutableStateFlow(false)
    val autoCopy: StateFlow<Boolean> = _autoCopy.asStateFlow()

    private val _isSaved = MutableStateFlow(false)
    val isSaved: StateFlow<Boolean> = _isSaved.asStateFlow()

    init {
        viewModelScope.launch {
            dataStore.backendUrl.collect { url ->
                _backendUrl.value = url
                repository.updateBaseUrl(url)
            }
        }
        viewModelScope.launch {
            dataStore.defaultStyle.collect { _selectedStyle.value = it }
        }
        viewModelScope.launch {
            dataStore.defaultEmojis.collect { _selectedEmojis.value = it }
        }
        viewModelScope.launch {
            dataStore.customSignature.collect { _customSignature.value = it }
        }
        viewModelScope.launch {
            dataStore.autoCopy.collect { _autoCopy.value = it }
        }
    }

    fun setBackendUrl(url: String) {
        _backendUrl.value = url
        _isSaved.value = false
    }

    fun setStyle(style: String) {
        _selectedStyle.value = style
    }

    fun setEmojis(emojis: String) {
        _selectedEmojis.value = emojis
    }

    fun setCustomSignature(sig: String) {
        _customSignature.value = sig
    }

    fun setAutoCopy(auto: Boolean) {
        _autoCopy.value = auto
    }

    fun saveSettings() {
        viewModelScope.launch {
            val url = _backendUrl.value.trim()
            dataStore.saveBackendUrl(url)
            dataStore.savePreferences(
                style = _selectedStyle.value,
                emojis = _selectedEmojis.value,
                signature = _customSignature.value,
                autoCopy = _autoCopy.value
            )
            repository.updateBaseUrl(url)
            _isSaved.value = true
            testConnection()
        }
    }

    fun testConnection() {
        viewModelScope.launch {
            _connectionStatus.value = ConnectionStatus.Testing
            repository.healthCheck().fold(
                onSuccess = { health ->
                    _connectionStatus.value = ConnectionStatus.Connected(
                        "Conectado com sucesso ao servidor (${health.appName})"
                    )
                    loadServerSettings()
                },
                onFailure = { error ->
                    _connectionStatus.value = ConnectionStatus.Error(
                        "Erro ao conectar: ${error.localizedMessage ?: "Verifique a URL"}"
                    )
                }
            )
        }
    }

    private fun loadServerSettings() {
        viewModelScope.launch {
            repository.getSettings().fold(
                onSuccess = { res ->
                    _appSettings.value = res.settings
                },
                onFailure = {}
            )
        }
    }
}
