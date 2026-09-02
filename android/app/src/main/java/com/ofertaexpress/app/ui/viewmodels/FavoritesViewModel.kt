package com.ofertaexpress.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ofertaexpress.app.data.datastore.AppPreferencesDataStore
import com.ofertaexpress.app.data.models.HistoryItem
import com.ofertaexpress.app.data.repository.OfertaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class FavoritesViewModel(application: Application) : AndroidViewModel(application) {

    private val dataStore = AppPreferencesDataStore(application)
    private var repository = OfertaRepository(AppPreferencesDataStore.DEFAULT_LOCAL_BACKEND)

    private val _items = MutableStateFlow<List<HistoryItem>>(emptyList())
    val items: StateFlow<List<HistoryItem>> = _items.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        viewModelScope.launch {
            dataStore.backendUrl.collect { url ->
                repository.updateBaseUrl(url)
                loadFavorites()
            }
        }
    }

    fun loadFavorites() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getHistory(favoritesOnly = true).fold(
                onSuccess = { list ->
                    _items.value = list
                },
                onFailure = {
                    _items.value = emptyList()
                }
            )
            _isLoading.value = false
        }
    }

    fun toggleFavorite(id: String) {
        viewModelScope.launch {
            repository.toggleFavorite(id).fold(
                onSuccess = { isFav ->
                    if (!isFav) {
                        _items.value = _items.value.filter { it.id != id }
                    }
                },
                onFailure = {}
            )
        }
    }
}
